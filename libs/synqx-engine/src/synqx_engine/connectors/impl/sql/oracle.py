from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import text, event
from synqx_core.errors import ConfigurationError, DataTransferError
from synqx_core.utils.resilience import retry

from synqx_engine.connectors.impl.sql.base import SQLConnector, logger
from synqx_engine.connectors.impl.sql.postgres import PostgresConfig

try:
    import oracledb
except ImportError:
    oracledb = None


class OracleConfig(PostgresConfig):
    port: int = 1521


class OracleConnector(SQLConnector):
    """
    Robust Oracle Connector using SQLAlchemy and oracledb.
    """

    def __init__(self, config: dict[str, Any]):
        if oracledb is None:
            logger.error("The 'oracledb' library is required for the Oracle connector.")
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            OracleConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Oracle configuration: {e}")  # noqa: B904

    def _sqlalchemy_url(self) -> str:
        conf = OracleConfig.model_validate(self.config)
        return (
            f"oracle+oracledb://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )

    def _get_engine_options(self) -> dict[str, Any]:
        options = super()._get_engine_options()
        # Use connection_timeout_seconds from config if available, default to 60 for Oracle
        timeout = self.config.get("connection_timeout_seconds", 60)
        
        # Add Oracle-specific connection arguments
        options["connect_args"] = {
            "expire_time": 2, # TCP Keepalive (minutes)
            "tcp_connect_timeout": timeout
        }
        return options

    def connect(self) -> None:
        """Connect with event listeners for LOB handling."""
        if self._connection and not self._connection.closed:
            return
            
        super().connect()
        
        # Configure the connection to automatically fetch LOBs as values (string/bytes)
        # This is CRITICAL for ProSource and general Oracle stability.
        # It prevents "LOB locator expired" errors and serialization issues.
        if self._connection:
            raw_conn = self._connection.connection.dbapi_connection
            if hasattr(raw_conn, "outputtypehandler"):
                def OutputTypeHandler(cursor, name, default_type, size, precision, scale):
                    if default_type == oracledb.DB_TYPE_CLOB:
                        return cursor.var(oracledb.DB_TYPE_LONG, arraysize=cursor.arraysize)
                    if default_type == oracledb.DB_TYPE_BLOB:
                        return cursor.var(oracledb.DB_TYPE_LONG_RAW, arraysize=cursor.arraysize)
                
                raw_conn.outputtypehandler = OutputTypeHandler

    def test_connection(self) -> bool:
        try:
            self.connect()
            self._connection.execute(text("SELECT 1 FROM DUAL"))
            return True
        except Exception as e:
            logger.error(f"Oracle connection test failed: {e}")
            return False

    def check_health(self) -> dict[str, Any]:
        """
        Deeper diagnostic for Oracle connector.
        """
        try:
            import time  # noqa: PLC0415
            from datetime import UTC, datetime  # noqa: PLC0415

            start = time.perf_counter()
            self.connect()
            dialect = str(self._engine.dialect.name)
            version = (
                str(self._engine.dialect.server_version_info)
                if hasattr(self._engine.dialect, "server_version_info")
                else "unknown"
            )

            # Execute Oracle ping
            self._connection.execute(text("SELECT 1 FROM DUAL"))
            latency = (time.perf_counter() - start) * 1000

            return {
                "status": "healthy",
                "dialect": dialect,
                "server_version": version,
                "latency_ms": round(latency, 2),
                "pool_size": self._get_engine_options().get("pool_size"),
                "timestamp": datetime.now(UTC).isoformat(),
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(UTC).isoformat(),
            }

    @retry(exceptions=(Exception,), max_attempts=3)
    def execute_query(
        self,
        query: str,
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> list[dict[str, Any]]:
        self.connect()
        try:
            # CLEANUP: Remove internal keys
            self._clean_internal_kwargs(kwargs)
            bind_params = kwargs.copy()

            clean_query = query.strip().rstrip(";")
            logger.info(
                f"Executing Oracle SQL: {clean_query} | Params: {bind_params} | Limit: {limit} | Offset: {offset}"
            )

            # Oracle 12c+ Pagination
            if limit or offset:
                # Wrap to ensure we can apply offset/fetch
                final_query = clean_query
                if offset is not None:
                    final_query += f" OFFSET {int(offset)} ROWS"
                if limit is not None:
                    final_query += f" FETCH NEXT {int(limit)} ROWS ONLY"
            else:
                final_query = clean_query

            if not final_query.strip().upper().startswith("SELECT"):
                self._connection.execute(
                    text(final_query), bind_params if bind_params else None
                )
                return []

            df = pd.read_sql_query(
                text(final_query),
                con=self._connection,
                params=bind_params if bind_params else None,
            )

            # Handle BLOB/CLOB/Binary data for JSON safety and performance in previews
            for col in df.columns:
                # Detect columns that might contain binary data or are objects
                if df[col].dtype == 'object':
                    def sanitize_lob(val):
                        if val is None:
                            return None
                        
                        # Handle bytes/bytearray (BLOB/RAW)
                        if isinstance(val, (bytes, bytearray)):
                            size_bytes = len(val)
                            if size_bytes > 524288: # > 512KB, truncate in preview
                                return f"<BLOB: {size_bytes/1024/1024:.2f} MB - Preview Truncated>"
                            # Otherwise return as string representation if it's meant for a preview list
                            # For actual data transfer, read_batch will yield the real bytes.
                            return f"<BLOB: {size_bytes/1024:.2f} KB>"
                        
                        # Handle long strings (CLOB) - cap at 10KB for preview UI
                        if isinstance(val, str) and len(val) > 10240:
                            return val[:1024] + "... <CLOB Truncated for Preview>"
                        
                        return val
                    
                    df[col] = df[col].apply(sanitize_lob)

            logger.info(f"Query Result: {len(df)} rows returned")
            return df.replace({np.nan: None}).to_dict(orient="records")
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise DataTransferError(f"Query execution failed. Detailed fault: {e!s}")
