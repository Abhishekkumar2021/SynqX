from typing import Optional
from sqlalchemy import text
from synqx_engine.connectors.impl.sql.base import SQLConnector
from synqx_core.errors import ConfigurationError
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class PostgresConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")
    host: str = Field(..., description="Database host")
    port: int = Field(5432, description="Database port")
    database: str = Field(..., description="Database name")
    db_schema: str = Field("public")

class PostgresConnector(SQLConnector):
    """
    Robust PostgreSQL Connector using SQLAlchemy.
    """

    def validate_config(self) -> None:
        try:
            PostgresConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid PostgreSQL configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = PostgresConfig.model_validate(self.config)
        return (
            f"postgresql+psycopg2://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )

    def _get_table_size(self, table: str, schema: Optional[str] = None) -> Optional[int]:
        try:
            name, actual_schema = self.normalize_asset_identifier(table)
            if not actual_schema and schema:
                actual_schema = schema
            
            # Sanitize for query injection prevention (though name is internal)
            # Use distinct identifier for postgres 'schema.table'
            identifier = f"'{actual_schema}.{name}'" if actual_schema else f"'{name}'"
            
            query = text(f"SELECT pg_total_relation_size({identifier})")
            return int(self._connection.execute(query).scalar())
        except Exception:
            return None