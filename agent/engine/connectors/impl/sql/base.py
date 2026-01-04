from abc import abstractmethod
from typing import Any, Dict, List, Optional, Iterator, Union
import pandas as pd
import numpy as np
import json
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine, Connection
from engine.connectors.base import BaseConnector
from engine.core.errors import (
    ConnectionFailedError,
    AuthenticationError,
    SchemaDiscoveryError,
    DataTransferError,
)
from engine.core.logging import get_logger

logger = get_logger(__name__)

class SQLConnector(BaseConnector):
    """
    Base class for all SQL-based connectors using SQLAlchemy.
    Provides robust implementations for common SQL operations.
    """
    
    def __init__(self, config: Dict[str, Any]):
        self._engine: Optional[Engine] = None
        self._connection: Optional[Connection] = None
        super().__init__(config)

    @abstractmethod
    def _sqlalchemy_url(self) -> str:
        pass

    def _get_engine_options(self) -> Dict[str, Any]:
        return {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "future": True
        }

    def connect(self) -> None:
        if self._connection and not self._connection.closed:
            return
        
        try:
            if not self._engine:
                self._engine = create_engine(
                    self._sqlalchemy_url(), 
                    **self._get_engine_options()
                )
            self._connection = self._engine.connect()
        except Exception as e:
            msg = str(e).lower()
            if "authentication" in msg or "denied" in msg or "password" in msg:
                raise AuthenticationError(f"Authentication failed: {e}")
            raise ConnectionFailedError(f"Connection failed: {e}")

    def disconnect(self) -> None:
        try:
            if self._connection:
                self._connection.close()
            if self._engine:
                self._engine.dispose()
        except Exception as e:
            logger.warning(f"Error during disconnect: {e}")
        finally:
            self._connection = None
            self._engine = None

    def test_connection(self) -> bool:
        try:
            self.connect()
            self._connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            inspector = inspect(self._engine)
            _, db_schema = self.normalize_asset_identifier("") # Get default schema
            
            tables = inspector.get_table_names(schema=db_schema)
            views = inspector.get_view_names(schema=db_schema)
            all_assets = tables + views

            if pattern:
                all_assets = [t for t in all_assets if pattern.lower() in t.lower()]

            if not include_metadata:
                return [
                    {
                        "name": t, 
                        "fully_qualified_name": f"{db_schema}.{t}" if db_schema else t,
                        "type": "table" if t in tables else "view"
                    } 
                    for t in all_assets
                ]

            results = []
            for asset in all_assets:
                results.append({
                    "name": asset,
                    "fully_qualified_name": f"{db_schema}.{asset}" if db_schema else asset,
                    "type": "table" if asset in tables else "view",
                    "schema": db_schema,
                    "row_count": self._get_row_count(asset, db_schema),
                })
            return results
        except Exception as e:
            raise SchemaDiscoveryError(f"Failed to discover assets: {e}")

    def _get_row_count(self, table: str, schema: Optional[str] = None) -> Optional[int]:
        try:
            name, actual_schema = self.normalize_asset_identifier(table)
            table_ref = f"{actual_schema}.{name}" if actual_schema else name
            query = text(f"SELECT COUNT(*) FROM {table_ref}")
            return int(self._connection.execute(query).scalar())
        except Exception:
            return None

    def infer_schema(
        self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs
    ) -> Dict[str, Any]:
        self.connect()
        name, schema = self.normalize_asset_identifier(asset)
        
        if mode == "metadata":
            return self._schema_from_metadata(name, schema)
        
        try:
            return self._schema_from_metadata(name, schema)
        except Exception:
            if mode == "sample" or mode == "auto":
                return self._schema_from_sample(asset, schema, sample_size)
            raise

    def _schema_from_metadata(self, asset: str, schema: Optional[str]) -> Dict[str, Any]:
        try:
            name, actual_schema = self.normalize_asset_identifier(asset)
            inspector = inspect(self._engine)
            columns = inspector.get_columns(name, schema=actual_schema)
            return {
                "asset": name,
                "schema": actual_schema,
                "columns": [
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col.get("nullable"),
                        "primary_key": col.get("primary_key", False),
                    }
                    for col in columns
                ],
            }
        except Exception as e:
            raise SchemaDiscoveryError(f"Metadata extraction failed: {e}")

    def _schema_from_sample(self, asset: str, schema: Optional[str], sample_size: int) -> Dict[str, Any]:
        try:
            df = next(self.read_batch(asset, limit=sample_size))
            name, actual_schema = self.normalize_asset_identifier(asset)
            return {
                "asset": name,
                "schema": actual_schema,
                "columns": [{"name": col, "type": str(dtype)} for col, dtype in df.dtypes.items()],
            }
        except Exception as e:
            raise SchemaDiscoveryError(f"Sample-based inference failed: {e}")

    def read_batch(
        self, asset: str, limit: Optional[int] = None, offset: Optional[int] = None, **kwargs
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        
        custom_query = kwargs.get("query")
        incremental_filter = kwargs.get("incremental_filter")
        params = kwargs.pop("params", {}) or {}

        if custom_query:
            clean_query = custom_query.strip().rstrip(';')
            
            if incremental_filter and isinstance(incremental_filter, dict):
                where_clauses = []
                for i, (col, val) in enumerate(incremental_filter.items()):
                    param_name = f"inc_{i}"
                    where_clauses.append(f"{col} > :{param_name}")
                    params[param_name] = val
                
                if where_clauses:
                    clean_query = f"SELECT * FROM ({clean_query}) AS inc_subq WHERE {' AND '.join(where_clauses)}"

            # Safely apply limit and offset using a subquery wrap
            if limit or offset:
                query = f"SELECT * FROM ({clean_query}) AS batch_subq"
                if limit:
                    query += f" LIMIT {limit}"
                if offset:
                    query += f" OFFSET {offset}"
            else:
                query = clean_query
        else:
            name, schema = self.normalize_asset_identifier(asset)
            table_ref = f"{schema}.{name}" if schema else name
            query = f"SELECT * FROM {table_ref}"
            
            # Apply Incremental Logic
            if incremental_filter and isinstance(incremental_filter, dict):
                where_clauses = []
                for i, (col, val) in enumerate(incremental_filter.items()):
                    param_name = f"inc_{i}"
                    where_clauses.append(f"{col} > :{param_name}")
                    params[param_name] = val
                
                if where_clauses:
                    query += f" WHERE {' AND '.join(where_clauses)}"

            if limit:
                query += f" LIMIT {limit}"
            if offset:
                query += f" OFFSET {offset}"
        
        # UI uses 'batch_size', SQLAlchemy uses 'chunksize'
        chunksize = kwargs.pop("chunksize", kwargs.pop("batch_size", 10000))
        try:
            for chunk in pd.read_sql_query(text(query), con=self._connection, chunksize=chunksize, params=params, **kwargs):
                yield chunk
        except Exception as e:
            raise DataTransferError(f"Read failed for {asset}: {e}")

    def get_total_count(self, query_or_asset: str, is_query: bool = False, **kwargs) -> Optional[int]:
        self.connect()
        try:
            if is_query:
                clean_query = query_or_asset.strip().rstrip(';')
                count_query = f"SELECT COUNT(*) FROM ({clean_query}) AS total_count_subq"
            else:
                name, schema = self.normalize_asset_identifier(query_or_asset)
                table_ref = f"{schema}.{name}" if schema else name
                count_query = f"SELECT COUNT(*) FROM {table_ref}"
            
            result = self._connection.execute(text(count_query)).scalar()
            return int(result) if result is not None else None
        except Exception as e:
            logger.warning(f"Failed to get total count for {query_or_asset}: {e}")
            return None
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
            
            # Safely apply limit and offset using a subquery wrap
            if limit or offset:
                final_query = f"SELECT * FROM ({clean_query}) AS query_subq"
                if limit:
                    final_query += f" LIMIT {limit}"
                if offset:
                    final_query += f" OFFSET {offset}"
            else:
                final_query = clean_query
            
            df = pd.read_sql_query(text(final_query), con=self._connection, **kwargs)
            return df.replace({np.nan: None}).to_dict(orient="records")
        except Exception as e:
            raise DataTransferError(f"Query execution failed: {e}")

    def write_batch(
        self, data: Union[pd.DataFrame, Iterator[pd.DataFrame]], asset: str, mode: str = "append", **kwargs
    ) -> int:
        self.connect()
        name, schema = self.normalize_asset_identifier(asset)
        
        # Normalize mode
        clean_mode = mode.lower()
        if clean_mode == "replace":
            clean_mode = "overwrite"

        # Discover target columns to prevent errors from extra columns (e.g. joined results)
        try:
            inspector = inspect(self._engine)
            target_columns = [c['name'] for c in inspector.get_columns(name, schema=schema)]
        except Exception as e:
            logger.warning(f"Could not inspect columns for {asset}, skipping auto-filter: {e}")
            target_columns = []

        if isinstance(data, pd.DataFrame):
            data_iter = [data]
        else:
            data_iter = data
            
        total = 0
        try:
            first_chunk = True
            for df in data_iter:
                if df is None or df.empty: 
                    continue
                
                # Filter columns if we successfully inspected the target
                if target_columns:
                    valid_cols = [c for c in df.columns if c in target_columns]
                    if not valid_cols:
                        logger.warning(f"No matching columns for {asset}. Data columns: {df.columns.tolist()}")
                        continue
                    df = df[valid_cols]

                # Robust type conversion for SQL
                for col in df.columns:
                    if df[col].dtype == 'object':
                        df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x)
                
                # Handle Write Mode
                if_exists_val = 'append'
                if first_chunk and clean_mode == 'overwrite':
                    if_exists_val = 'replace'
                
                if clean_mode == 'upsert':
                    logger.warning(f"Upsert requested for {asset} but generic SQLConnector only supports append/overwrite. Falling back to append.")

                df.to_sql(
                    name=name,
                    schema=schema,
                    con=self._connection,
                    if_exists=if_exists_val,
                    index=False,
                    **kwargs
                )
                total += len(df)
                first_chunk = False
            return total
        except Exception as e:
            raise DataTransferError(f"Write failed for {asset}: {e}")
