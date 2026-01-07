from app.connectors.factory import ConnectorFactory
from app.connectors.impl.sql.postgres import PostgresConnector
from app.connectors.impl.sql.sqlite import SQLiteConnector
from app.connectors.impl.sql.duckdb import DuckDBConnector
from app.connectors.impl.sql.mysql import MySQLConnector
from app.connectors.impl.sql.mariadb import MariaDBConnector
from app.connectors.impl.sql.mssql import MSSQLConnector
from app.connectors.impl.sql.oracle import OracleConnector
from app.connectors.impl.sql.redshift import RedshiftConnector
from app.connectors.impl.sql.snowflake import SnowflakeConnector
from app.connectors.impl.sql.databricks import DatabricksConnector
from app.connectors.impl.sql.bigquery import BigQueryConnector
from app.connectors.impl.files.local import LocalFileConnector
from app.connectors.impl.files.s3 import S3Connector
from app.connectors.impl.files.gcs import GCSConnector
from app.connectors.impl.files.azure_blob import AzureBlobConnector
from app.connectors.impl.files.sftp import SFTPConnector
from app.connectors.impl.nosql.mongodb import MongoDBConnector
from app.connectors.impl.nosql.dynamodb import DynamoDBConnector
from app.connectors.impl.nosql.cassandra import CassandraConnector
from app.connectors.impl.nosql.redis import RedisConnector
from app.connectors.impl.nosql.elasticsearch import ElasticsearchConnector
from app.connectors.impl.nosql.kafka import KafkaConnector
from app.connectors.impl.nosql.rabbitmq import RabbitMQConnector
from app.connectors.impl.api.rest import RestApiConnector
from app.connectors.impl.api.graphql import GraphQLConnector
from app.connectors.impl.api.google_sheets import GoogleSheetsConnector
from app.connectors.impl.api.airtable import AirtableConnector
from app.connectors.impl.api.salesforce import SalesforceConnector
from app.connectors.impl.generic.custom_script import CustomScriptConnector
from app.connectors.impl.generic.dbt import DbtConnector

# Register all concrete connector implementations
ConnectorFactory.register_connector("postgresql", PostgresConnector)
ConnectorFactory.register_connector("mysql", MySQLConnector)
ConnectorFactory.register_connector("mariadb", MariaDBConnector)
ConnectorFactory.register_connector("mssql", MSSQLConnector)
ConnectorFactory.register_connector("oracle", OracleConnector)
ConnectorFactory.register_connector("redshift", RedshiftConnector)
ConnectorFactory.register_connector("snowflake", SnowflakeConnector)
ConnectorFactory.register_connector("databricks", DatabricksConnector)
ConnectorFactory.register_connector("bigquery", BigQueryConnector)
ConnectorFactory.register_connector("sqlite", SQLiteConnector)
ConnectorFactory.register_connector("duckdb", DuckDBConnector)
ConnectorFactory.register_connector("local_file", LocalFileConnector)
ConnectorFactory.register_connector("s3", S3Connector)
ConnectorFactory.register_connector("gcs", GCSConnector)
ConnectorFactory.register_connector("azure_blob", AzureBlobConnector)
ConnectorFactory.register_connector("sftp", SFTPConnector)
ConnectorFactory.register_connector("ftp", SFTPConnector) # Reuse SFTP for FTP placeholder
ConnectorFactory.register_connector("mongodb", MongoDBConnector)
ConnectorFactory.register_connector("dynamodb", DynamoDBConnector)
ConnectorFactory.register_connector("cassandra", CassandraConnector)
ConnectorFactory.register_connector("redis", RedisConnector)
ConnectorFactory.register_connector("elasticsearch", ElasticsearchConnector)
ConnectorFactory.register_connector("kafka", KafkaConnector)
ConnectorFactory.register_connector("rabbitmq", RabbitMQConnector)
ConnectorFactory.register_connector("rest_api", RestApiConnector)
ConnectorFactory.register_connector("graphql", GraphQLConnector)
ConnectorFactory.register_connector("google_sheets", GoogleSheetsConnector)
ConnectorFactory.register_connector("airtable", AirtableConnector)
ConnectorFactory.register_connector("salesforce", SalesforceConnector)
ConnectorFactory.register_connector("custom_script", CustomScriptConnector)
ConnectorFactory.register_connector("dbt", DbtConnector)
