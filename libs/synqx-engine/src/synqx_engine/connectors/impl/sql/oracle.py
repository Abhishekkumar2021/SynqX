from typing import Any
import numpy as np
import pandas as pd
from sqlalchemy import text
from synqx_core.errors import ConfigurationError, DataTransferError
from synqx_core.utils.resilience import retry
from synqx_engine.connectors.impl.sql.base import SQLConnector, logger
from synqx_engine.connectors.impl.sql.postgres import PostgresConfig


class OracleConfig(PostgresConfig):
    port: int = 1521


class OracleConnector(SQLConnector):
    """
    Robust Oracle Connector using SQLAlchemy and oracledb.
    """

    def validate_config(self) -> None:
        try:
            OracleConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Oracle configuration: {e}")  # noqa: B904

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

            logger.info(f"Query Result: {len(df)} rows returned")
            return df.replace({np.nan: None}).to_dict(orient="records")
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise DataTransferError(f"Query execution failed. Detailed fault: {e!s}")
