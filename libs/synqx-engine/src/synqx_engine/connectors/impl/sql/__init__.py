from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.connectors.impl.sql.bigquery import BigQueryConnector
from synqx_engine.connectors.impl.sql.duckdb import DuckDBConnector
from synqx_engine.connectors.impl.sql.mariadb import MariaDBConnector
from synqx_engine.connectors.impl.sql.mssql import MSSQLConnector
from synqx_engine.connectors.impl.sql.mysql import MySQLConnector
from synqx_engine.connectors.impl.sql.oracle import OracleConnector
from synqx_engine.connectors.impl.sql.postgres import PostgresConnector
from synqx_engine.connectors.impl.sql.redshift import RedshiftConnector
from synqx_engine.connectors.impl.sql.snowflake import SnowflakeConnector
from synqx_engine.connectors.impl.sql.sqlite import SQLiteConnector

ConnectorFactory.register_connector("postgres", PostgresConnector)
ConnectorFactory.register_connector("postgresql", PostgresConnector)
ConnectorFactory.register_connector("mysql", MySQLConnector)
ConnectorFactory.register_connector("sqlite", SQLiteConnector)
ConnectorFactory.register_connector("mssql", MSSQLConnector)
ConnectorFactory.register_connector("oracle", OracleConnector)
ConnectorFactory.register_connector("snowflake", SnowflakeConnector)
ConnectorFactory.register_connector("redshift", RedshiftConnector)
ConnectorFactory.register_connector("bigquery", BigQueryConnector)
ConnectorFactory.register_connector("mariadb", MariaDBConnector)
ConnectorFactory.register_connector("duckdb", DuckDBConnector)
