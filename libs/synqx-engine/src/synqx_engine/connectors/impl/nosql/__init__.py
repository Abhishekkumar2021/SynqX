from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.connectors.impl.nosql.cassandra import CassandraConnector
from synqx_engine.connectors.impl.nosql.dynamodb import DynamoDBConnector
from synqx_engine.connectors.impl.nosql.elasticsearch import ElasticsearchConnector
from synqx_engine.connectors.impl.nosql.kafka import KafkaConnector
from synqx_engine.connectors.impl.nosql.mongodb import MongoDBConnector
from synqx_engine.connectors.impl.nosql.rabbitmq import RabbitMQConnector
from synqx_engine.connectors.impl.nosql.redis import RedisConnector

ConnectorFactory.register_connector("mongodb", MongoDBConnector)
ConnectorFactory.register_connector("dynamodb", DynamoDBConnector)
ConnectorFactory.register_connector("cassandra", CassandraConnector)
ConnectorFactory.register_connector("redis", RedisConnector)
ConnectorFactory.register_connector("elasticsearch", ElasticsearchConnector)
ConnectorFactory.register_connector("kafka", KafkaConnector)
ConnectorFactory.register_connector("rabbitmq", RabbitMQConnector)
