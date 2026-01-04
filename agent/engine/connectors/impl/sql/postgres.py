from engine.connectors.impl.sql.base import SQLConnector
from engine.core.errors import ConfigurationError
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