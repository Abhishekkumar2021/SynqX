from engine.connectors.impl.sql.base import SQLConnector
from engine.core.errors import ConfigurationError
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class DatabricksConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)

    server_hostname: str = Field(..., description="Server Hostname")
    http_path: str = Field(..., description="HTTP Path")
    access_token: str = Field(..., description="Personal Access Token")
    catalog: str = Field("hive_metastore", description="Catalog Name")
    schema_name: str = Field("default", description="Schema/Database Name")

class DatabricksConnector(SQLConnector):
    """
    Databricks Connector using SQLAlchemy (requires databricks-sqlalchemy).
    """

    def validate_config(self) -> None:
        try:
            DatabricksConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Databricks configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = DatabricksConfig.model_validate(self.config)
        # SQLAlchemy URL format for Databricks
        return (
            f"databricks://token:{conf.access_token}"
            f"@{conf.server_hostname}?"
            f"http_path={conf.http_path}&"
            f"catalog={conf.catalog}&"
            f"schema={conf.schema_name}"
        )
