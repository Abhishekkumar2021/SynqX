from abc import abstractmethod
from typing import Any, Dict, List, Optional, Iterator, Union
import pandas as pd
import numpy as np
import json
from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine, Connection
from synqx_engine.connectors.base import BaseConnector
from synqx_core.models.enums import SchemaEvolutionPolicy
from synqx_core.utils.resilience import retry
from synqx_core.utils.data import is_df_empty
from synqx_core.errors import (
    ConnectionFailedError,
    AuthenticationError,
    SchemaDiscoveryError,
    DataTransferError,
)
from synqx_core.logging import get_logger

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

    def supports_pushdown(self) -> bool:
        return True

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

    @retry(exceptions=(Exception,), max_attempts=3)
    def connect(self) -> None:
        if self._connection and not self._connection.closed:
            return
        
        try:
            if not self._engine:
                from synqx_engine.core.engine_manager import EngineManager
                self._engine = EngineManager.get_engine(
                    connector_type=self.__class__.__name__,
                    url=self._sqlalchemy_url(),
                    options=self._get_engine_options(),
                    config=self.config
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
            # PERFORMANCE: Do NOT dispose self._engine here. 
            # The EngineManager maintains the engine lifecycle for pool reuse.
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
        self,
        pattern: Optional[str] = None,
        include_metadata: bool = False,
        **kwargs
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
                # Even without full metadata, basic stats are useful if cheap
                # But for now, we stick to the requested logic or maybe enable it?
                # User complaint implies they want it. Let's make sure if they ask for it (include_metadata=True), they get it.
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
                row_count = self._get_row_count(asset, db_schema)
                size_bytes = self._get_table_size(asset, db_schema)
                
                # Fetch full schema metadata if requested
                schema_metadata = None
                try:
                    schema_metadata = self.infer_schema(asset)
                except Exception:
                    pass

                results.append({
                    "name": asset,
                    "fully_qualified_name": f"{db_schema}.{asset}" if db_schema else asset,
                    "type": "table" if asset in tables else "view",
                    "schema": db_schema,
                    "row_count": row_count,
                    "size_bytes": size_bytes,
                    "schema_metadata": schema_metadata
                })
            return results
        except Exception as e:
            raise SchemaDiscoveryError(f"Failed to discover assets: {e}")

    def _get_row_count(self, table: str, schema: Optional[str] = None) -> Optional[int]:
        try:
            name, actual_schema = self.normalize_asset_identifier(table)
            # Use provided schema if not in identifier
            if not actual_schema and schema:
                actual_schema = schema
                
            table_ref = f"{actual_schema}.{name}" if actual_schema else name
            query = text(f"SELECT COUNT(*) FROM {table_ref}")
            return int(self._connection.execute(query).scalar())
        except Exception:
            return None

    def _get_table_size(self, table: str, schema: Optional[str] = None) -> Optional[int]:
        """
        Estimate table size in bytes. 
        Override this in specific dialects (Postgres, MySQL, etc).
        """
        return None

    def infer_schema(
        self,
        asset: str,
        sample_size: int = 1000,
        mode: str = "auto",
        **kwargs
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

    @retry(exceptions=(Exception,), max_attempts=3)
    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs
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
                    clean_query = f"SELECT * FROM ({clean_query}) AS inc_subq WHERE {" AND ".join(where_clauses)}"

            # Safely apply limit and offset using a subquery wrap
            if limit or offset:
                query = f"SELECT * FROM ({clean_query}) AS batch_subq"
                if limit:
                    query += f" LIMIT {int(limit)}"
                if offset:
                    query += f" OFFSET {int(offset)}"
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
                    query += f" WHERE {" AND ".join(where_clauses)}"

            if limit:
                query += f" LIMIT {int(limit)}"
            if offset:
                query += f" OFFSET {int(offset)}"
        
        # UI uses 'batch_size', SQLAlchemy uses 'chunksize'
        chunksize_val = kwargs.pop("chunksize", None) or kwargs.pop("batch_size", None)
        chunksize = int(chunksize_val) if chunksize_val and int(chunksize_val) > 0 else 10000
        
        # CLEANUP: Remove SynqX internal metadata that shouldn't reach pandas/sqlalchemy
        internal_keys = ["ui", "connection_id", "batch_size", "table", "asset", "query", "incremental_filter"]
        for key in internal_keys:
            kwargs.pop(key, None)
        
        try:
            for chunk in pd.read_sql_query(text(query), con=self._connection, chunksize=chunksize, params=params, **kwargs):
                yield chunk
        except Exception as e:
            raise DataTransferError(f"Stream read failed for entity '{asset}'. Underlying fault: {str(e)}")

    def get_total_count(self, query_or_asset: str, is_query: bool = False, **kwargs) -> Optional[int]:
        self.connect()
        try:
            # CLEANUP: Remove metadata
            kwargs.pop("ui", None)
            kwargs.pop("connection_id", None)
            bind_params = kwargs.copy()

            if is_query:
                clean_query = query_or_asset.strip().rstrip(';')
                count_query = f"SELECT COUNT(*) FROM ({clean_query}) AS total_count_subq"
            else:
                name, schema = self.normalize_asset_identifier(query_or_asset)
                table_ref = f"{schema}.{name}" if schema else name
                count_query = f"SELECT COUNT(*) FROM {table_ref}"
            
            logger.debug(f"Calculating count: {count_query} | Params: {bind_params}")
            result = self._connection.execute(text(count_query), bind_params).scalar()
            return int(result) if result is not None else None
        except Exception as e:
            logger.warning(f"Failed to calculate total record count for '{query_or_asset}': {e}")
            return None

    @retry(exceptions=(Exception,), max_attempts=3)
    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            # CLEANUP: Remove metadata
            kwargs.pop("ui", None)
            kwargs.pop("connection_id", None)
            
            # Treat remaining kwargs as bind parameters
            bind_params = kwargs.copy()
            
            clean_query = query.strip().rstrip(';')
            logger.info(f"Executing SQL: {clean_query} | Params: {bind_params} | Limit: {limit} | Offset: {offset}")
            
            # Safely apply limit and offset using a subquery wrap
            if limit or offset:
                final_query = f"SELECT * FROM ({clean_query}) AS query_subq"
                if limit:
                    final_query += f" LIMIT {int(limit)}"
                if offset:
                    final_query += f" OFFSET {int(offset)}"
            else:
                final_query = clean_query
            
            # PERFORMANCE: For non-SELECT statements (INSERT/UPDATE/TRUNCATE), use direct execution
            if not final_query.strip().upper().startswith("SELECT"):
                self._connection.execute(text(final_query), bind_params if bind_params else None)
                return []

            # Pass bind parameters explicitly to pandas
            df = pd.read_sql_query(text(final_query), con=self._connection, params=bind_params if bind_params else None)
            
            logger.info(f"Query Result: {len(df)} rows returned")
            return df.replace({np.nan: None}).to_dict(orient="records")
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise DataTransferError(f"Query execution failed. Detailed fault: {str(e)}")

    @retry(exceptions=(Exception,), max_attempts=3)
    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs
    ) -> int:
        self.connect()
        
        # CLEANUP: Remove SynqX internal metadata that shouldn't reach pandas
        internal_keys = ["ui", "connection_id", "write_mode", "write_strategy", "table", "target_table"]
        for key in internal_keys:
            kwargs.pop(key, None)
        
        name, schema = self.normalize_asset_identifier(asset)
        
        # Normalize mode
        clean_mode = mode.lower()
        if clean_mode == "replace":
            clean_mode = "overwrite"

        evolution_policy = kwargs.get("schema_evolution_policy", SchemaEvolutionPolicy.STRICT)

        # 1. Discover target columns (Cached for the duration of this batch)
        table_exists = False
        try:
            inspector = inspect(self._engine)
            target_columns_info = inspector.get_columns(name, schema=schema)
            target_columns = [c['name'] for c in target_columns_info]
            table_exists = len(target_columns) > 0
        except Exception as e:
            logger.debug(f"Target '{asset}' not yet initialized: {e}")
            target_columns = []

        if isinstance(data, pd.DataFrame):
            data_iter = [data]
        else:
            data_iter = data
            
        total = 0
        try:
            first_chunk = True
            for df in data_iter:
                if is_df_empty(df): 
                    continue
                
                # --- SCHEMA EVOLUTION & COMPLIANCE ---
                new_cols = [c for c in df.columns if c not in target_columns] if table_exists else []
                
                if new_cols:
                    if evolution_policy == SchemaEvolutionPolicy.STRICT:
                        msg = f"Schema Breach: New columns {new_cols} detected but policy is STRICT for '{asset}'."
                        logger.error(msg)
                        raise DataTransferError(msg)
                    
                    elif evolution_policy == SchemaEvolutionPolicy.EVOLVE:
                        logger.info(f"Schema Evolution: Automatically adding {len(new_cols)} columns to '{asset}'")
                        for col in new_cols:
                            dtype = str(df[col].dtype).lower()
                            sql_type = "TEXT" 
                            if "int" in dtype: sql_type = "BIGINT"
                            elif "float" in dtype or "double" in dtype: sql_type = "DOUBLE PRECISION"
                            elif "bool" in dtype: sql_type = "BOOLEAN"
                            elif "datetime" in dtype: sql_type = "TIMESTAMP"
                            elif "json" in dtype or "object" in dtype:
                                sql_type = "JSONB" if "postgres" in str(self._engine.url).lower() else "TEXT"
                            
                            table_ref = f"\"{schema}\".\"{name}\"" if schema else f"\"{name}\""
                            alter_stmt = f"ALTER TABLE {table_ref} ADD COLUMN \"{col}\" {sql_type}"
                            
                            try:
                                self._connection.execute(text(alter_stmt))
                                self._connection.execute(text("COMMIT")) 
                                target_columns.append(col) 
                            except Exception as alter_err:
                                raise DataTransferError(f"Failed to evolve schema for '{asset}': {alter_err}")
                    
                    elif evolution_policy == SchemaEvolutionPolicy.IGNORE:
                        logger.warning(f"Schema Evolution (IGNORE): Dropping new columns {new_cols} from stream for '{asset}'")
                        df = df[target_columns]

                # Case: Safety Filter for missing columns in source (Nullable by default in target is fine)
                if table_exists and evolution_policy != SchemaEvolutionPolicy.EVOLVE:
                    # Only include columns that actually exist in target
                    df = df[[c for c in df.columns if c in target_columns]]

                # 2. Handle Write Mode
                if_exists_val = 'append'
                if first_chunk:
                    if clean_mode == 'overwrite':
                        if_exists_val = 'replace'
                    elif not table_exists:
                        if_exists_val = 'replace'
                        table_exists = True # Created now
                
                # Robust type conversion
                for col in df.columns:
                    if df[col].dtype == 'object':
                        df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x)

                df.to_sql(
                    name=name,
                    schema=schema,
                    con=self._connection,
                    if_exists=if_exists_val,
                    index=False,
                    **kwargs
                )
                
                # If we just created the table, refresh target_columns
                if first_chunk and if_exists_val == 'replace':
                    target_columns = df.columns.tolist()
                    table_exists = True

                total += len(df)
                first_chunk = False
            return total
        except Exception as e:
            raise DataTransferError(f"Target commit failed for entity '{asset}'. Detailed fault: {str(e)}")