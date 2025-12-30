from app.connectors.impl.sql.base import SQLConnector
from app.connectors.impl.sql.postgres import PostgresConfig
from app.core.errors import ConfigurationError

class MSSQLConfig(PostgresConfig):
    port: int = 1433
    db_schema: str = "dbo"

class MSSQLConnector(SQLConnector):
    """
    Robust MSSQL Connector using SQLAlchemy and pymssql.
    """

    def validate_config(self) -> None:
        try:
            MSSQLConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid MSSQL configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = MSSQLConfig.model_validate(self.config)
        return (
            f"mssql+pymssql://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )