from typing import Any, Dict, Iterator, List, Optional, Union
import pandas as pd
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError, ConnectionFailedError
from synqx_core.logging import get_logger

try:
    from pyairtable import Api, Table
except ImportError:
    Api = None
    Table = None

logger = get_logger(__name__)

class AirtableConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    api_key: str = Field(..., description="Personal Access Token (PAT)")
    base_id: str = Field(..., description="Airtable Base ID")

class AirtableConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        if Api is None:
            raise ConfigurationError("pyairtable not installed. Run 'pip install pyairtable'.")
        
        self._config_model: Optional[AirtableConfig] = None
        self._api: Optional[Api] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = AirtableConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid Airtable configuration: {e}")

    def connect(self) -> None:
        if self._api:
            return
        try:
            self._api = Api(self._config_model.api_key)
            # Verify base access
            self._api.base(self._config_model.base_id).metadata()
        except Exception as e:
            raise ConnectionFailedError(f"Failed to connect to Airtable: {e}")

    def disconnect(self) -> None:
        self._api = None

    def test_connection(self) -> bool:
        try:
            self.connect()
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        self.connect()
        try:
            base = self._api.base(self._config_model.base_id)
            tables = base.tables()
            assets = []
            for t in tables:
                if pattern and pattern not in t.name:
                    continue
                assets.append({
                    "name": t.name,
                    "fully_qualified_name": f"{self._config_model.base_id}/{t.id}",
                    "type": "table",
                    "table_id": t.id
                })
            return assets
        except Exception:
            return []

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        self.connect()
        # asset can be name or ID. Walk assets to find.
        # Simplest: fetch 1 record
        try:
            table = self._api.table(self._config_model.base_id, asset)
            records = table.all(max_records=1)
            if not records:
                return {"asset": asset, "columns": [], "type": "table"}
            
            fields = records[0]["fields"]
            columns = []
            for name, val in fields.items():
                py_type = type(val).__name__
                synqx_type = "string"
                if py_type == "int":
                    synqx_type = "integer"
                elif py_type == "float":
                    synqx_type = "float"
                elif py_type == "bool":
                    synqx_type = "boolean"
                
                columns.append({"name": name, "type": synqx_type, "native_type": py_type})
            
            return {
                "asset": asset,
                "columns": columns,
                "type": "table"
            }
        except Exception:
            return {"asset": asset, "columns": [], "type": "table"}

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        self.connect()
        table = self._api.table(self._config_model.base_id, asset)
        
        # Airtable pagination is handled by pyairtable iterate()
        batch_size = kwargs.get("batch_size", 100)
        
        for record_batch in table.iterate(page_size=batch_size, max_records=limit):
            batch_data = []
            for record in record_batch:
                row = record["fields"]
                row["_airtable_id"] = record["id"]
                batch_data.append(row)
            
            if batch_data:
                yield pd.DataFrame(batch_data)

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        self.connect()
        table = self._api.table(self._config_model.base_id, asset)
        
        if isinstance(data, pd.DataFrame):
            iterator = [data]
        else:
            iterator = data
            
        total = 0
        for df in iterator:
            # Airtable expects list of dicts for batch_create
            records = df.replace({pd.NA: None, float('nan'): None}).to_dict(orient='records')
            # Remove _airtable_id if present to avoid errors on create
            for r in records:
                r.pop("_airtable_id", None)
            
            table.batch_create(records)
            total += len(records)
            
        return total

    def execute_query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        raise NotImplementedError("Airtable does not support raw SQL queries. Use table selection.")
