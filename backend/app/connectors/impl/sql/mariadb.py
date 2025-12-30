from app.connectors.impl.sql.base import SQLConnector
from app.connectors.impl.sql.postgres import PostgresConfig
from app.core.errors import ConfigurationError

class MariaDBConfig(PostgresConfig):
    port: int = 3306

class MariaDBConnector(SQLConnector):
    """
    Robust MariaDB Connector using SQLAlchemy.
    """

    def validate_config(self) -> None:
        try:
            MariaDBConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid MariaDB configuration: {e}")

    def _sqlalchemy_url(self) -> str:
        conf = MariaDBConfig.model_validate(self.config)
        return (
            f"mysql+pymysql://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )