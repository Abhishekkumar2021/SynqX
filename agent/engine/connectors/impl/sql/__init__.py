import logging
import importlib
from engine.connectors.factory import ConnectorFactory

logger = logging.getLogger("SynqX-Agent")

def _register(name, module_path, class_name):
    try:
        mod = importlib.import_module(module_path)
        cls = getattr(mod, class_name)
        ConnectorFactory.register_connector(name, cls)
    except ImportError as e:
        logger.warning(f"SQL Connector '{name}' skipped due to missing dependency: {e}")
    except Exception as e:
        logger.warning(f"Error registering SQL connector '{name}': {e}")

# Register all concrete SQL connector implementations
_register("postgresql", "engine.connectors.impl.sql.postgres", "PostgresConnector")
_register("postgres", "engine.connectors.impl.sql.postgres", "PostgresConnector")
_register("mysql", "engine.connectors.impl.sql.mysql", "MySQLConnector")
_register("mariadb", "engine.connectors.impl.sql.mariadb", "MariaDBConnector")
_register("mssql", "engine.connectors.impl.sql.mssql", "MSSQLConnector")
_register("oracle", "engine.connectors.impl.sql.oracle", "OracleConnector")
_register("snowflake", "engine.connectors.impl.sql.snowflake", "SnowflakeConnector")
_register("redshift", "engine.connectors.impl.sql.redshift", "RedshiftConnector")
_register("bigquery", "engine.connectors.impl.sql.bigquery", "BigQueryConnector")
_register("sqlite", "engine.connectors.impl.sql.sqlite", "SQLiteConnector")
_register("duckdb", "engine.connectors.impl.sql.duckdb", "DuckDBConnector")