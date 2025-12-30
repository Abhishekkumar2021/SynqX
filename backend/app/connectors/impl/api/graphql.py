from typing import Any, Dict, Iterator, List, Optional, Union
import json
import pandas as pd
import requests
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from app.connectors.base import BaseConnector
from app.core.errors import ConfigurationError, ConnectionFailedError, DataTransferError
from app.core.logging import get_logger

logger = get_logger(__name__)

class GraphQLConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", case_sensitive=False)
    
    url: str = Field(..., description="GraphQL Endpoint URL")
    headers: Optional[str] = Field(None, description="Custom Headers (JSON)")
    auth_token: Optional[str] = Field(None, description="Bearer Token")

class GraphQLConnector(BaseConnector):
    def __init__(self, config: Dict[str, Any]):
        self._config_model: Optional[GraphQLConfig] = None
        super().__init__(config)

    def validate_config(self) -> None:
        try:
            self._config_model = GraphQLConfig.model_validate(self.config)
        except Exception as e:
            raise ConfigurationError(f"Invalid GraphQL configuration: {e}")

    def connect(self) -> None:
        # Stateless
        pass

    def disconnect(self) -> None:
        # Stateless
        pass

    def test_connection(self) -> bool:
        # Simple introspection query
        query = "{ __schema { types { name } } }"
        try:
            self.execute_query(query, limit=1)
            return True
        except Exception:
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        # GraphQL doesn't have "tables", but we can treat Query fields as assets
        query = """
        {
          __type(name: "Query") {
            fields {
              name
              description
            }
          }
        }
        """
        try:
            resp = self._request(query)
            fields = resp.get("data", {}).get("__type", {}).get("fields", [])
            assets = []
            for f in fields:
                if pattern and pattern not in f["name"]:
                    continue
                assets.append({
                    "name": f["name"],
                    "fully_qualified_name": f["name"],
                    "type": "query_field",
                    "description": f.get("description")
                })
            return assets
        except Exception:
            return []

    def infer_schema(self, asset: str, **kwargs) -> Dict[str, Any]:
        return {
            "asset": asset,
            "columns": [], # Requires complex introspection or sample
            "type": "api"
        }

    def _request(self, query: str, variables: Optional[Dict] = None):
        headers = {"Content-Type": "application/json"}
        if self._config_model.headers:
            headers.update(json.loads(self._config_model.headers))
        if self._config_model.auth_token:
            headers["Authorization"] = f"Bearer {self._config_model.auth_token}"
            
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
            
        resp = requests.post(self._config_model.url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        # asset is expected to be a valid GraphQL query string here or a field name
        # If it's just a field name, we need a wrapped query. 
        # For simplicity, we assume asset is the field name and we construct a simple query.
        
        query = kwargs.get("query")
        if not query:
            # Fallback: list the field with some common subfields if possible, or fail
            raise DataTransferError("A full GraphQL query must be provided in 'query' parameter.")
            
        resp = self._request(query, variables=kwargs.get("variables"))
        data = resp.get("data", {})
        
        # Traverse data to find the array
        # This is simplified; real impl would use data_path
        target = data.get(asset) or list(data.values())[0]
        
        if isinstance(target, list):
            yield pd.DataFrame(target)
        elif isinstance(target, dict):
            yield pd.DataFrame([target])

    def write_batch(
        self,
        data: Union[pd.DataFrame, Iterator[pd.DataFrame]],
        asset: str, # Mutation name
        mode: str = "append",
        **kwargs,
    ) -> int:
        raise NotImplementedError("GraphQL writing (mutations) not yet supported in SynqX.")

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        resp = self._request(query, variables=kwargs.get("variables"))
        data = resp.get("data", {})
        # Return the first list found or the root object
        for v in data.values():
            if isinstance(v, list): return v
        return [data]
