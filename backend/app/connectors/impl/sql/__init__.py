from app.connectors.factory import ConnectorFactory
from app.connectors.impl.sql.postgres import PostgresConnector
from app.connectors.impl.sql.mysql import MySQLConnector
from app.connectors.impl.sql.sqlite import SQLiteConnector
from app.connectors.impl.sql.mssql import MSSQLConnector
from app.connectors.impl.sql.oracle import OracleConnector
from app.connectors.impl.sql.snowflake import SnowflakeConnector
from app.connectors.impl.sql.redshift import RedshiftConnector
from app.connectors.impl.sql.bigquery import BigQueryConnector
from app.connectors.impl.sql.mariadb import MariaDBConnector
from app.connectors.impl.sql.duckdb import DuckDBConnector

ConnectorFactory.register_connector("postgres", PostgresConnector)
ConnectorFactory.register_connector("mysql", MySQLConnector)
ConnectorFactory.register_connector("sqlite", SQLiteConnector)
ConnectorFactory.register_connector("mssql", MSSQLConnector)
ConnectorFactory.register_connector("oracle", OracleConnector)
ConnectorFactory.register_connector("snowflake", SnowflakeConnector)
ConnectorFactory.register_connector("redshift", RedshiftConnector)
ConnectorFactory.register_connector("bigquery", BigQueryConnector)
ConnectorFactory.register_connector("mariadb", MariaDBConnector)
ConnectorFactory.register_connector("duckdb", DuckDBConnector)
