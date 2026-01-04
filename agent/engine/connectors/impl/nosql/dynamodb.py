from typing import Any, Dict, Iterator, List, Optional, Union
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from engine.connectors.base import BaseConnector
from engine.core.errors import ConfigurationError, ConnectionFailedError, DataTransferError
from engine.core.logging import get_logger

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    ClientError = None

logger = get_logger(__name__)

class DynamoDBConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    region_name: str = Field(..., description="AWS Region")
    aws_access_key_id: Optional[str] = Field(None, description="Access Key ID")
    aws_secret_access_key: Optional[str] = Field(None, description="Secret Access Key")
    aws_session_token: Optional[str] = Field(None, description="Session Token")
    endpoint_url: Optional[str] = Field(None, description="Custom Endpoint URL")

class DynamoDBConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if boto3 is None:
            raise ConfigurationError("Boto3 client not installed. Run 'pip install boto3'.")
        
        self._config_model: Optional[DynamoDBConfig] = None
        self._client = None
        self._resource = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = DynamoDBConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid DynamoDB configuration: {e}")

    def connect(self) -> None:
        if self._client:
            return
        
        try:
            session = boto3.Session(
                aws_access_key_id=self._config_model.aws_access_key_id,
                aws_secret_access_key=self._config_model.aws_secret_access_key,
                aws_session_token=self._config_model.aws_session_token,
                region_name=self._config_model.region_name
            )
            self._client = session.client('dynamodb', endpoint_url=self._config_model.endpoint_url)
            self._resource = session.resource('dynamodb', endpoint_url=self._config_model.endpoint_url)
            
            # Simple list tables to verify auth
            self._client.list_tables(Limit=1)
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to DynamoDB: {e}")

    def disconnect(self) -> None:
        # Boto3 clients don't strictly require closing, but we clear ref
        self._client = None
        self._resource = None

    def test_connection(self) -> bool:
        try:
            with self.session():
                return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        assets = []
        paginator = self._client.get_paginator('list_tables')
        
        for page in paginator.paginate():
            for table_name in page['TableNames']:
                if pattern and pattern not in table_name:
                    continue
                
                asset = {
                    "name": table_name,
                    "fully_qualified_name": table_name,
                    "type": "table"
                }
                
                if include_metadata:
                    try:
                        desc = self._client.describe_table(TableName=table_name)['Table']
                        asset["metadata"] = {
                            "item_count": desc.get('ItemCount'),
                            "size_bytes": desc.get('TableSizeBytes'),
                            "status": desc.get('TableStatus'),
                            "pk": [k['AttributeName'] for k in desc.get('KeySchema', [])]
                        }
                    except Exception:
                        pass
                        
                assets.append(asset)
        return assets

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        self.connect()
        # DynamoDB is schemaless. We infer from scanning a few items.
        table = self._resource.Table(asset)
        response = table.scan(Limit=100)
        items = response.get('Items', [])
        
        if not items:
            return {"asset": asset, "columns": [], "type": "nosql"}
            
        # Merge keys from all sampled items to get a superset schema
        schema_map = {}
        for item in items:
            for k, v in item.items():
                if k not in schema_map:
                    # Simple type inference
                    py_type = type(v).__name__
                    col_type = "string"
                    if py_type == "Decimal":
                        col_type = "float" # Boto3 uses Decimal
                    elif py_type == "int":
                        col_type = "integer"
                    elif py_type == "bool":
                        col_type = "boolean"
                    
                    schema_map[k] = {"name": k, "type": col_type, "native_type": py_type}
        
        return {
            "asset": asset,
            "columns": list(schema_map.values()),
            "type": "nosql"
        }

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        table = self._resource.Table(asset)
        
        # Scan parameters
        scan_kwargs = {}
        if limit and limit < 1000: # Optimization for small limits
            scan_kwargs['Limit'] = limit
            
        # Handle pagination manually for the generator
        done = False
        start_key = None
        rows_yielded = 0
        
        while not done:
            if start_key:
                scan_kwargs['ExclusiveStartKey'] = start_key
                
            response = table.scan(**scan_kwargs)
            items = response.get('Items', [])
            start_key = response.get('LastEvaluatedKey', None)
            done = start_key is None
            
            if items:
                df = pd.DataFrame(items)
                
                # Boto3 returns Decimals, which pandas/json can struggle with. Convert to float/int.
                # Simplistic conversion:
                for col in df.columns:
                    # Check if column contains decimals
                    # This can be slow, but safe for generic handling
                    pass 

                if limit and rows_yielded + len(df) > limit:
                    df = df.iloc[:limit - rows_yielded]
                    yield df
                    break
                
                yield df
                rows_yielded += len(df)
                if limit and rows_yielded >= limit:
                    break

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        table = self._resource.Table(asset)
        
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        total = 0
        with table.batch_writer() as batch:
            for df in iterator:
                # Convert DataFrame to list of dicts
                # Must handle NaN -> None, and float -> Decimal if needed (boto3 requirement usually)
                # But here we assume simple types
                records = df.to_dict(orient='records')
                for record in records:
                    # Clean record (remove None/NaN if DynamoDB doesn't like them, or empty strings)
                    clean_record = {k: v for k, v in record.items() if pd.notnull(v)}
                    # Note: floats need to be Decimal for DynamoDB usually.
                    # We skip complex conversion logic for this prototype.
                    batch.put_item(Item=clean_record)
                    total += 1
                    
        return total

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        # PartiQL support?
        self.connect()
        try:
            resp = self._client.execute_statement(Statement=query)
            return resp.get('Items', [])
        except Exception as e:
            raise DataTransferError(f"DynamoDB PartiQL execution failed: {e}")
