from synqx_engine.connectors.impl.sql.base import SQLConnector
from synqx_engine.connectors.impl.sql.postgres import PostgresConfig
from synqx_core.errors import ConfigurationError

class MySQLConfig(PostgresConfig):
    port: int = 3306

class MySQLConnector(SQLConnector):
    """
    Robust MySQL Connector using SQLAlchemy.
    """

    def validate_config(self) -> None:
        try:
            MySQLConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid MySQL configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = MySQLConfig.model_validate(self.config)
        return (
            f"mysql+pymysql://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )