from typing import Any, Dict, Iterator, List, Optional, Union
import json
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from engine.connectors.base import BaseConnector
from engine.core.errors import ConfigurationError, ConnectionFailedError
from engine.core.logging import get_logger

try:
    import pika
except ImportError:
    pika = None

logger = get_logger(__name__)

class RabbitMQConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    host: str = Field(..., description="RabbitMQ Host")
    port: int = Field(5672, description="RabbitMQ Port")
    username: Optional[str] = Field(None, description="Username")
    password: Optional[str] = Field(None, description="Password")
    virtual_host: str = Field("/", description="Virtual Host")

class RabbitMQConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if pika is None:
            raise ConfigurationError("Pika client not installed. Run 'pip install pika'.")
        
        self._config_model: Optional[RabbitMQConfig] = None
        self._connection: Optional[pika.BlockingConnection] = None
        self._channel: Optional[pika.adapters.blocking_connection.BlockingChannel] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = RabbitMQConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid RabbitMQ configuration: {e}")

    def connect(self) -> None:
        if self._connection and self._connection.is_open:
            return
        
        try:
            credentials = None
            if self._config_model.username:
                credentials = pika.PlainCredentials(self._config_model.username, self._config_model.password)
            
            params = pika.ConnectionParameters(
                host=self._config_model.host,
                port=self._config_model.port,
                virtual_host=self._config_model.virtual_host,
                credentials=credentials
            )
            self._connection = pika.BlockingConnection(params)
            self._channel = self._connection.channel()
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to RabbitMQ: {e}")

    def disconnect(self) -> None:
        if self._connection:
            if self._connection.is_open:
                self._connection.close()
            self._connection = None
            self._channel = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        # Pika doesn't support listing queues directly (management API needed).
        # We can accept a manual list or pattern as "discovered"
        return []

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        return {
            "asset": asset,
            "columns": [
                {"name": "body", "type": "string"},
                {"name": "routing_key", "type": "string"},
                {"name": "exchange", "type": "string"},
            ],
            "type": "queue"
        }

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        # asset = queue_name
        
        batch_size = kwargs.get("batch_size", 100)
        messages = []
        rows_yielded = 0
        
        # Consume logic
        # We use basic_get for polling instead of consume callback for generator pattern
        
        while True:
            method_frame, header_frame, body = self._channel.basic_get(queue=asset, auto_ack=True)
            
            if method_frame:
                try:
                    content = body.decode('utf-8')
                    # Try json?
                    try:
                        content = json.loads(content)
                        if isinstance(content, dict):
                            content = json.dumps(content)
                    except json.JSONDecodeError:
                        pass
                except (AttributeError, UnicodeDecodeError):
                    content = str(body)

                messages.append({
                    "body": content,
                    "routing_key": method_frame.routing_key,
                    "exchange": method_frame.exchange
                })
            else:
                break # Queue empty
            
            if len(messages) >= batch_size:
                df = pd.DataFrame(messages)
                yield df
                rows_yielded += len(df)
                messages = []
                
                if limit and rows_yielded >= limit:
                    break
        
        if messages:
            yield pd.DataFrame(messages)

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str, # Interpreted as routing_key or "exchange:routing_key"
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        
        exchange = ""
        routing_key = asset
        if ":" in asset:
            parts = asset.split(":", 1)
            exchange = parts[0]
            routing_key = parts[1]
            
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        total = 0
        for df in iterator:
            for _, row in df.iterrows():
                body = row.get("body")
                if body is None: 
                    # If whole row is data
                    body = row.to_json()
                
                if not isinstance(body, str):
                    body = str(body)
                    
                self._channel.basic_publish(
                    exchange=exchange,
                    routing_key=routing_key,
                    body=body
                )
                total += 1
        
        return total

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        raise NotImplementedError("RabbitMQ does not support queries.")
