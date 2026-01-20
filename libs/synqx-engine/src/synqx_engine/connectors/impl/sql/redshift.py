from synqx_core.errors import ConfigurationError

from synqx_engine.connectors.impl.sql.base import SQLConnector
from synqx_engine.connectors.impl.sql.postgres import PostgresConfig


class RedshiftConfig(PostgresConfig):
    port: int = 5439


class RedshiftConnector(SQLConnector):
    """
    Robust Amazon Redshift Connector using SQLAlchemy.
    """

    def validate_config(self) -> None:
        try:
            RedshiftConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Redshift configuration: {e}")  # noqa: B904

    def _sqlalchemy_url(self) -> str:
        conf = RedshiftConfig.model_validate(self.config)
        return (
            f"postgresql+psycopg2://"
            f"{conf.username}:{conf.password}"
            f"@{conf.host}:{conf.port}/"
            f"{conf.database}"
        )
