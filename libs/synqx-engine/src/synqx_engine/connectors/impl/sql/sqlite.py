import os
from collections.abc import Iterator
from datetime import datetime
from typing import Any

import pandas as pd
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Connection, Engine
from synqx_core.errors import (
    ConfigurationError,
    ConnectionFailedError,
    DataTransferError,
    SchemaDiscoveryError,
)
from synqx_core.logging import get_logger
from synqx_core.utils.data import is_df_empty

from synqx_engine.connectors.base import BaseConnector

logger = get_logger(__name__)


class SQLiteConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    database_path: str = Field(...)


class SQLiteConnector(BaseConnector):
    def __init__(self, config: dict[str, Any]):
        self._config_model: SQLiteConfig | None = None
        self._engine: Engine | None = None
        self._connection: Connection | None = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = SQLiteConfig.model_validate(self.config)
            db_dir = os.path.dirname(self._config_model.database_path)
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
        except Exception as e:
            raise ConfigurationError(f"Invalid SQLite configuration: {e}")  # noqa: B904

    def _url(self) -> str:
        return f"sqlite:///{self._config_model.database_path}"

    def connect(self) -> None:
        if self._connection and not self._connection.closed:
            return
        try:
            self._engine = create_engine(self._url())
            self._connection = self._engine.connect()
        except Exception as e:
            raise ConnectionFailedError(f"SQLite connection failed: {e}")  # noqa: B904

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
        self, pattern: str | None = None, include_metadata: bool = False, **kwargs
    ) -> list[dict[str, Any]]:
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

    def _get_row_count(self, table: str) -> int | None:
        try:
            q = text(f'SELECT COUNT(*) FROM "{table}"')
            result = self._connection.execute(q).scalar()
            return int(result)
        except Exception:
            return None

    def infer_schema(
        self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs
    ) -> dict[str, Any]:
        self.connect()

        if mode == "metadata":
            return self._schema_metadata(asset)
        if mode == "sample":
            return self._schema_sample(asset, sample_size)

        try:
            return self._schema_metadata(asset)
        except Exception:
            return self._schema_sample(asset, sample_size)

    def _schema_metadata(self, asset: str) -> dict[str, Any]:
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
            raise SchemaDiscoveryError(f"Metadata schema failed: {e}")  # noqa: B904

    def _schema_sample(self, asset: str, sample_size: int) -> dict[str, Any]:
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
            raise SchemaDiscoveryError(f"Sample-based schema failed: {e}")  # noqa: B904

    def read_batch(
        self,
        asset: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()

        query = f'SELECT * FROM "{asset}"'
        if limit is not None:
            query += f" LIMIT {int(limit)}"
        if offset is not None:
            query += f" OFFSET {int(offset)}"

        chunksize_val = kwargs.get("chunksize") or kwargs.get("batch_size")
        chunksize = (
            int(chunksize_val) if chunksize_val and int(chunksize_val) > 0 else 10000
        )

        # CLEANUP: Remove internal keys
        self._clean_internal_kwargs(kwargs)

        try:
            it = pd.read_sql_query(
                text(query), con=self._connection, chunksize=chunksize, **kwargs
            )
            for chunk in it:  # noqa: UP028
                yield chunk
        except Exception as e:
            raise DataTransferError(f"Failed to read from '{asset}': {e}")  # noqa: B904

    def write_batch(
        self,
        data: pd.DataFrame | Iterator[pd.DataFrame],
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

        # CLEANUP: Remove internal keys
        self._clean_internal_kwargs(kwargs)

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
            raise DataTransferError(f"Failed to write to '{asset}': {e}")  # noqa: B904

    def execute_query(
        self,
        query: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> list[dict[str, Any]]:
        self.connect()
        try:
            clean_query = query.strip().rstrip(";")
            final_query = clean_query
            if limit and "limit" not in clean_query.lower():
                final_query += f" LIMIT {int(limit)}"
            if offset and "offset" not in clean_query.lower():
                final_query += f" OFFSET {int(offset)}"

            # CLEANUP: Remove internal keys
            self._clean_internal_kwargs(kwargs)

            df = pd.read_sql_query(text(final_query), con=self._connection, **kwargs)
            return df.where(pd.notnull(df), None).to_dict(orient="records")
        except Exception as e:
            raise DataTransferError(f"SQLite query execution failed: {e}")  # noqa: B904
