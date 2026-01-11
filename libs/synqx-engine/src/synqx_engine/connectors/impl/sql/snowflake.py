from typing import Optional
from synqx_engine.connectors.impl.sql.base import SQLConnector
from synqx_core.errors import ConfigurationError
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class SnowflakeConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    user: str = Field(..., description="Snowflake User")
    password: str = Field(..., description="Snowflake Password")
    account: str = Field(..., description="Snowflake Account (e.g. xy12345.us-east-1)")
    warehouse: str = Field(..., description="Warehouse")
    database: str = Field(..., description="Database")
    schema_name: str = Field("PUBLIC", alias="schema", description="Schema")
    role: Optional[str] = Field(None, description="Role")

class SnowflakeConnector(SQLConnector):
    """
    Robust Snowflake Connector using SQLAlchemy.
    """

    def validate_config(self) -> None:
        try:
            SnowflakeConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Snowflake configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = SnowflakeConfig.model_validate(self.config)
        url = (
            f"snowflake://{conf.user}:{conf.password}"
            f"@{conf.account}/{conf.database}/{conf.schema_name}"
            f"?warehouse={conf.warehouse}"
        )
        if conf.role:
            url += f"&role={conf.role}"
        return url