import logging
import importlib
from engine.connectors.factory import ConnectorFactory

logger = logging.getLogger("SynqX-Agent")

def _register(name, module, class_name):
    try:
        # Dynamic import to isolate dependencies
        mod = importlib.import_module(module)
        cls = getattr(mod, class_name)
        ConnectorFactory.register_connector(name, cls)
    except ImportError as e:
        logger.warning(f"Connector '{name}' skipped due to missing dependency: {e}")
    except Exception as e:
        logger.warning(f"Error registering connector '{name}': {e}")

# SQL Connectors
_register("postgresql", "engine.connectors.impl.sql.postgres", "PostgresConnector")
_register("mysql", "engine.connectors.impl.sql.mysql", "MySQLConnector")
_register("mariadb", "engine.connectors.impl.sql.mariadb", "MariaDBConnector")
_register("mssql", "engine.connectors.impl.sql.mssql", "MSSQLConnector")
_register("oracle", "engine.connectors.impl.sql.oracle", "OracleConnector")
_register("redshift", "engine.connectors.impl.sql.redshift", "RedshiftConnector")
_register("snowflake", "engine.connectors.impl.sql.snowflake", "SnowflakeConnector")
_register("databricks", "engine.connectors.impl.sql.databricks", "DatabricksConnector")
_register("bigquery", "engine.connectors.impl.sql.bigquery", "BigQueryConnector")
_register("sqlite", "engine.connectors.impl.sql.sqlite", "SQLiteConnector")
_register("duckdb", "engine.connectors.impl.sql.duckdb", "DuckDBConnector")

# File Connectors
_register("local_file", "engine.connectors.impl.files.local", "LocalFileConnector")
_register("s3", "engine.connectors.impl.files.s3", "S3Connector")
_register("gcs", "engine.connectors.impl.files.gcs", "GCSConnector")
_register("azure_blob", "engine.connectors.impl.files.azure_blob", "AzureBlobConnector")
_register("sftp", "engine.connectors.impl.files.sftp", "SFTPConnector")
_register("ftp", "engine.connectors.impl.files.sftp", "SFTPConnector")

# NoSQL Connectors
_register("mongodb", "engine.connectors.impl.nosql.mongodb", "MongoDBConnector")
_register("dynamodb", "engine.connectors.impl.nosql.dynamodb", "DynamoDBConnector")
_register("cassandra", "engine.connectors.impl.nosql.cassandra", "CassandraConnector")
_register("redis", "engine.connectors.impl.nosql.redis", "RedisConnector")
_register("elasticsearch", "engine.connectors.impl.nosql.elasticsearch", "ElasticsearchConnector")
_register("kafka", "engine.connectors.impl.nosql.kafka", "KafkaConnector")
_register("rabbitmq", "engine.connectors.impl.nosql.rabbitmq", "RabbitMQConnector")

# API Connectors
_register("rest_api", "engine.connectors.impl.api.rest", "RestApiConnector")
_register("graphql", "engine.connectors.impl.api.graphql", "GraphQLConnector")
_register("google_sheets", "engine.connectors.impl.api.google_sheets", "GoogleSheetsConnector")
_register("airtable", "engine.connectors.impl.api.airtable", "AirtableConnector")
_register("salesforce", "engine.connectors.impl.api.salesforce", "SalesforceConnector")

# Generic/Custom
_register("custom_script", "engine.connectors.impl.generic.custom_script", "CustomScriptConnector")