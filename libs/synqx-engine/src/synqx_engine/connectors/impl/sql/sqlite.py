from typing import Any, Dict, List, Optional, Iterator, Union
import os
import pandas as pd
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Connection, Engine
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from datetime import datetime

from synqx_engine.connectors.base import BaseConnector
from synqx_core.utils.data import is_df_empty
from synqx_core.errors import (
    ConfigurationError,
    ConnectionFailedError,
    SchemaDiscoveryError,
    DataTransferError,
)
from synqx_core.logging import get_logger

logger = get_logger(__name__)


class SQLiteConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    database_path: str = Field(...)


class SQLiteConnector(BaseConnector):

    def __init__(self, config: Dict[str, Any]):
        self._config_model: Optional[SQLiteConfig] = None
        self._engine: Optional[Engine] = None
        self._connection: Optional[Connection] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = SQLiteConfig.model_validate(self.config)
            db_dir = os.path.dirname(self._config_model.database_path)
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
        except Exception as e:
            raise ConfigurationError(f"Invalid SQLite configuration: {e}")

    def _url(self) -> str:
        return f"sqlite:///{self._config_model.database_path}"

    def connect(self) -> None:
        if self._connection and not self._connection.closed:
            return
        try:
            self._engine = create_engine(self._url())
            self._connection = self._engine.connect()
        except Exception as e:
            raise ConnectionFailedError(f"SQLite connection failed: {e}")

    def disconnect(self) -> None:
        if self._connection:
            try:
                self._connection.close()
            finally:
                self._connection = None
        if self._engine:
            try:
                self._engine.dispose()
            finally:
                self._engine = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                self._connection.execute(text("SELECT 1"))
                return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:

        self.connect()
        inspector = inspect(self._engine)
        tables = inspector.get_table_names()

        if pattern:
            tables = [t for t in tables if pattern.lower() in t.lower()]

        if not include_metadata:
            return [{"name": t} for t in tables]

        results = []
        for tbl in tables:
            row_count = self._get_row_count(tbl)
            db_path = self._config_model.database_path
            stat = os.stat(db_path)

            results.append(
                {
                    "name": tbl,
                    "type": "table",
                    "row_count": row_count,
                    "size_bytes": stat.st_size,
                    "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                }
            )

        return results

    def _get_row_count(self, table: str) -> Optional[int]:
        try:
            q = text(f'SELECT COUNT(*) FROM "{table}"')
            result = self._connection.execute(q).scalar()
            return int(result)
        except Exception:
            return None

    def infer_schema(
        self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs
    ) -> Dict[str, Any]:

        self.connect()

        if mode == "metadata":
            return self._schema_metadata(asset)
        if mode == "sample":
            return self._schema_sample(asset, sample_size)

        try:
            return self._schema_metadata(asset)
        except Exception:
            return self._schema_sample(asset, sample_size)

    def _schema_metadata(self, asset: str) -> Dict[str, Any]:
        inspector = inspect(self._engine)
        try:
            cols = inspector.get_columns(asset)
            return {
                "asset": asset,
                "columns": [
                    {
                        "name": c["name"],
                        "type": str(c["type"]),
                        "nullable": c.get("nullable"),
                        "default": c.get("default"),
                        "primary_key": c.get("primary_key", False),
                    }
                    for c in cols
                ],
            }
        except Exception as e:
            raise SchemaDiscoveryError(f"Metadata schema failed: {e}")

    def _schema_sample(self, asset: str, sample_size: int) -> Dict[str, Any]:
        try:
            df = next(self.read_batch(asset, limit=sample_size))
            return {
                "asset": asset,
                "columns": [
                    {"name": col, "type": str(dtype)}
                    for col, dtype in df.dtypes.items()
                ],
            }
        except Exception as e:
            raise SchemaDiscoveryError(f"Sample-based schema failed: {e}")

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:

        self.connect()

        query = f'SELECT * FROM "{asset}"'
        if limit is not None:
            query += f" LIMIT {int(limit)}"
        if offset is not None:
            query += f" OFFSET {int(offset)}"

        chunksize_val = kwargs.pop("chunksize", None) or kwargs.pop("batch_size", None)
        chunksize = int(chunksize_val) if chunksize_val and int(chunksize_val) > 0 else 10000

        try:
            it = pd.read_sql_query(
                text(query), con=self._connection, chunksize=chunksize, **kwargs
            )
            for chunk in it:
                yield chunk
        except Exception as e:
            raise DataTransferError(f"Failed to read from '{asset}': {e}")

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:

        self.connect()

        if isinstance(data, pd.DataFrame):
            data_iter = [data]
        else:
            data_iter = data

        total = 0

        try:
            for df in data_iter:
                if is_df_empty(df):
                    continue
                df.to_sql(
                    name=asset,
                    con=self._connection,
                    if_exists=mode,
                    index=False,
                    **kwargs,
                )
                total += len(df)
            return total
        except Exception as e:
            raise DataTransferError(f"Failed to write to '{asset}': {e}")

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            clean_query = query.strip().rstrip(';')
            final_query = clean_query
            if limit and "limit" not in clean_query.lower():
                final_query += f" LIMIT {int(limit)}"
            if offset and "offset" not in clean_query.lower():
                final_query += f" OFFSET {int(offset)}"
            
            df = pd.read_sql_query(text(final_query), con=self._connection, **kwargs)
            return df.where(pd.notnull(df), None).to_dict(orient="records")
        except Exception as e:
            raise DataTransferError(f"SQLite query execution failed: {e}")
