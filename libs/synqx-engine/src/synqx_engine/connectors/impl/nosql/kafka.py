from typing import Any, Dict, Iterator, List, Optional, Union
import json
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError, ConnectionFailedError
from synqx_core.logging import get_logger

try:
    from kafka import KafkaConsumer, KafkaProducer, KafkaAdminClient
    from kafka.errors import NoBrokersAvailable
except ImportError:
    KafkaConsumer = None
    KafkaProducer = None
    KafkaAdminClient = None

logger = get_logger(__name__)

class KafkaConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    bootstrap_servers: List[str] = Field(..., description="List of Kafka brokers (e.g. localhost:9092)")
    security_protocol: str = Field("PLAINTEXT", description="Protocol used to communicate with brokers")
    sasl_mechanism: Optional[str] = Field(None, description="SASL mechanism (e.g. PLAIN, SCRAM-SHA-256)")
    sasl_plain_username: Optional[str] = Field(None, description="SASL Username")
    sasl_plain_password: Optional[str] = Field(None, description="SASL Password")
    group_id: Optional[str] = Field(None, description="Consumer Group ID")

class KafkaConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if KafkaConsumer is None:
            raise ConfigurationError("Kafka client not installed. Run 'pip install kafka-python-ng'.")
        
        self._config_model: Optional[KafkaConfig] = None
        self._producer: Optional[KafkaProducer] = None
        self._consumer: Optional[KafkaConsumer] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            # Handle string list
            if isinstance(self.config.get("bootstrap_servers"), str):
                self.config["bootstrap_servers"] = [s.strip() for s in self.config["bootstrap_servers"].split(",")]
                
            self._config_model = KafkaConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Kafka configuration: {e}")

    def _get_common_args(self):
        args = {
            "bootstrap_servers": self._config_model.bootstrap_servers,
            "security_protocol": self._config_model.security_protocol,
        }
        if self._config_model.sasl_mechanism:
            args["sasl_mechanism"] = self._config_model.sasl_mechanism
            if self._config_model.sasl_plain_username:
                args["sasl_plain_username"] = self._config_model.sasl_plain_username
                args["sasl_plain_password"] = self._config_model.sasl_plain_password
        return args

    def connect(self) -> None:
        # Kafka connections are often lazy, but we verify connectivity here
        try:
            admin = KafkaAdminClient(**self._get_common_args())
            admin.list_topics()
            admin.close()
        except NoBrokersAvailable as e:
            raise ConnectionFailedError(f"No Kafka brokers available: {e}")
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to Kafka: {e}")

    def disconnect(self) -> None:
        if self._producer:
            self._producer.close()
            self._producer = None
        if self._consumer:
            self._consumer.close()
            self._consumer = None

    def test_connection(self) -> bool:
        try:
            self.connect()
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        try:
            admin = KafkaAdminClient(**self._get_common_args())
            topics = admin.list_topics()
            assets = []
            
            for topic in topics:
                if pattern and pattern not in topic:
                    continue
                
                # Exclude internal topics
                if topic.startswith("_"): 
                    continue
                    
                asset = {
                    "name": topic,
                    "fully_qualified_name": topic,
                    "type": "stream"
                }
                assets.append(asset)
            admin.close()
            return assets
        except Exception as e:
            logger.error(f"Failed to discover Kafka topics: {e}")
            return []

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        # Kafka has no intrinsic schema unless Schema Registry is used (advanced).
        # We assume a generic message structure.
        return {
            "asset": asset,
            "columns": [
                {"name": "key", "type": "string"},
                {"name": "value", "type": "string"}, # JSON or Text
                {"name": "timestamp", "type": "datetime"},
                {"name": "partition", "type": "integer"},
                {"name": "offset", "type": "integer"},
            ],
            "type": "stream"
        }

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        
        args = self._get_common_args()
        args["group_id"] = self._config_model.group_id or "synqx-explorer"
        args["auto_offset_reset"] = kwargs.get("auto_offset_reset", "earliest")
        args["enable_auto_commit"] = False # Manual control if needed, but for explorer we iterate
        args["consumer_timeout_ms"] = kwargs.get("timeout_ms", 5000) # Stop if no messages
        
        consumer = KafkaConsumer(asset, **args)
        
        batch_size = kwargs.get("batch_size", 1000)
        messages = []
        rows_yielded = 0
        
        # NOTE: Kafka is infinite. We rely on limit or timeout.
        try:
            for msg in consumer:
                row = {
                    "key": msg.key.decode('utf-8') if msg.key else None,
                    "value": None,
                    "timestamp": pd.to_datetime(msg.timestamp, unit='ms'),
                    "partition": msg.partition,
                    "offset": msg.offset
                }
                
                # Try to decode value as JSON, else string
                if msg.value:
                    try:
                        row["value"] = json.loads(msg.value.decode('utf-8'))
                        # Flatten if needed? For now keep as object/string
                        if isinstance(row["value"], dict):
                            row["value"] = json.dumps(row["value"]) # keep as string for dataframe consistency
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        try:
                            row["value"] = msg.value.decode('utf-8')
                        except UnicodeDecodeError:
                            row["value"] = str(msg.value) # binary representation
                
                messages.append(row)
                
                if len(messages) >= batch_size:
                    df = pd.DataFrame(messages)
                    yield df
                    rows_yielded += len(df)
                    messages = []
                    
                    if limit and rows_yielded >= limit:
                        break
            
            if messages:
                df = pd.DataFrame(messages)
                yield df
                
        finally:
            consumer.close()

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        # Mode is irrelevant for Kafka (always append)
        if not self._producer:
            self._producer = KafkaProducer(**self._get_common_args())
            
        total = 0
        
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        for df in iterator:
            for _, row in df.iterrows():
                # Determine key/value
                key = None
                value = None
                
                if "key" in row:
                    key = str(row["key"]).encode('utf-8')
                if "value" in row: 
                    value = row["value"]
                else:
                    # Treat whole row as value (JSON)
                    value = row.to_json()
                
                if isinstance(value, str):
                    value = value.encode('utf-8')
                elif isinstance(value, dict):
                    value = json.dumps(value).encode('utf-8')
                elif value is None:
                    pass # send None?
                
                self._producer.send(asset, key=key, value=value)
                total += 1
        
        self._producer.flush()
        return total

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        raise NotImplementedError("Kafka does not support direct queries. Use stream processing.")
