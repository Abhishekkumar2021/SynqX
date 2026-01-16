from typing import Any, Dict, Iterator, List, Optional, Union
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError, ConnectionFailedError, DataTransferError
from synqx_core.logging import get_logger

try:
    from simple_salesforce import Salesforce
except ImportError:
    Salesforce = None

logger = get_logger(__name__)

class SalesforceConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    username: str = Field(..., description="Salesforce Username")
    password: str = Field(..., description="Salesforce Password")
    security_token: str = Field(..., description="Security Token")
    domain: str = Field("login", description="Salesforce Domain (login or test)")

class SalesforceConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if Salesforce is None:
            raise ConfigurationError("simple-salesforce not installed. Run 'pip install simple-salesforce'.")
        
        self._config_model: Optional[SalesforceConfig] = None
        self._sf: Optional[Salesforce] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = SalesforceConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Salesforce configuration: {e}")

    def connect(self) -> None:
        if self._sf:
            return
        try:
            self._sf = Salesforce(
                username=self._config_model.username,
                password=self._config_model.password,
                security_token=self._config_model.security_token,
                domain=self._config_model.domain
            )
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to Salesforce: {e}")

    def disconnect(self) -> None:
        self._sf = None

    def test_connection(self) -> bool:
        try:
            self.connect()
            # Simple metadata fetch
            self._sf.describe()
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            desc = self._sf.describe()
            assets = []
            for obj in desc['sobjects']:
                name = obj['name']
                if pattern and pattern not in name:
                    continue
                if not obj['queryable']:
                    continue
                    
                asset = {
                    "name": name,
                    "fully_qualified_name": name,
                    "type": "sobject",
                    "label": obj['label']
                }
                assets.append(asset)
            return assets
        except Exception:
            return []

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        self.connect()
        try:
            obj_desc = getattr(self._sf, asset).describe()
            columns = []
            for field in obj_desc['fields']:
                py_type = field['type']
                synqx_type = "string"
                if py_type in ["int", "long"]:
                    synqx_type = "integer"
                elif py_type in ["double", "currency", "percent"]:
                    synqx_type = "float"
                elif py_type == "boolean":
                    synqx_type = "boolean"
                elif py_type in ["date", "datetime"]:
                    synqx_type = "datetime"
                
                columns.append({
                    "name": field['name'],
                    "type": synqx_type,
                    "native_type": py_type,
                    "label": field['label']
                })
            return {"asset": asset, "columns": columns, "type": "sobject"}
        except Exception:
            return {"asset": asset, "columns": [], "type": "sobject"}

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        
        # Build query
        # Fetch all fields by default or use query param
        if kwargs.get("query"):
            query = kwargs.get("query")
        else:
            schema = self.infer_schema(asset)
            fields = [c['name'] for c in schema['columns']]
            query = f"SELECT {', '.join(fields)} FROM {asset}"
            
        if limit:
            query += f" LIMIT {limit}"
        # Salesforce query doesn't support OFFSET easily without specific order/pk
        
        results = self._sf.query_all(query)
        records = results.get('records', [])
        
        if records:
            # Remove 'attributes' key from each record
            for r in records:
                r.pop('attributes', None)
            yield pd.DataFrame(records)

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        total = 0
        for df in iterator:
            # Clean data for Salesforce (NaN to None)
            records = df.replace({pd.NA: None, float('nan'): None}).to_dict(orient='records')
            
            if not records:
                continue

            try:
                # Use Bulk API for much better throughput
                if len(records) > 50:
                    logger.info(f"Using Salesforce Bulk API for {len(records)} records in '{asset}'")
                    # bulk_create returns a list of results
                    results = getattr(self._sf.bulk, asset).insert(records)
                    successes = sum(1 for r in results if r.get('success'))
                    total += successes
                    if successes < len(records):
                        logger.warning(f"Salesforce Bulk API: {len(records) - successes} records failed.")
                else:
                    # Simple API for small batches
                    for record in records:
                        try:
                            getattr(self._sf, asset).create(record)
                            total += 1
                        except Exception as e:
                            logger.error(f"Failed to create record in Salesforce: {e}")
            except Exception as e:
                logger.error(f"Salesforce Write Operation Failed: {e}")
                raise DataTransferError(f"Salesforce Write Failed: {e}")
                
        return total

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        self.connect()
        results = self._sf.query_all(query)
        records = results.get('records', [])
        for r in records:
            r.pop('attributes', None)
        return records
