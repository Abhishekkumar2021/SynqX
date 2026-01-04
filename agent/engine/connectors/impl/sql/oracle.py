from engine.connectors.impl.sql.base import SQLConnector
from engine.connectors.impl.sql.postgres import PostgresConfig
from engine.core.errors import ConfigurationError

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
            raise ConfigurationError(f"Invalid Oracle configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = OracleConfig.model_validate(self.config)
        return (
            f"oracle+oracledb://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )