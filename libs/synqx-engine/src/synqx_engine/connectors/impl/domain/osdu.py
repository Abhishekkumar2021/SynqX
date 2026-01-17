from typing import Any, Dict, List, Iterator, Optional
import requests
import pandas as pd
from synqx_engine.connectors.base import BaseConnector
from synqx_core.errors import ConfigurationError, ConnectionFailedError
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class OSDUConnector(BaseConnector):
    """
    Domain-aware connector for OSDU (Open Subsurface Data Universe).
    Interacts with Core Services:
    - Search (Discovery)
    - Storage (Record Retrieval)
    - Dataset/File (Signed URL Generation)
    - Schema (Type Definitions)
    - Entitlements (Authz)
    """

    def validate_config(self) -> None:
        required = ["osdu_url", "data_partition_id", "auth_token"]
        missing = [k for k in required if not self.config.get(k)]
        if missing:
            raise ConfigurationError(f"Missing OSDU config: {missing}")
        
        self.base_url = self.config["osdu_url"].rstrip("/")
        self.headers = {
            "data-partition-id": self.config["data_partition_id"],
            "Authorization": f"Bearer {self.config['auth_token']}",
            "Content-Type": "application/json"
        }

    def connect(self) -> None:
        pass

    def disconnect(self) -> None:
        pass

    def test_connection(self) -> bool:
        """
        Verifies connectivity and Entitlements.
        """
        try:
            # Check Entitlements Service (Standard Health Check)
            # This confirms the Token is valid AND the Partition is accessible
            url = f"{self.base_url}/api/entitlements/v2/groups"
            resp = requests.get(url, headers=self.headers, timeout=10)
            
            if resp.status_code == 401:
                raise ConnectionFailedError("OSDU Authentication failed (401)")
            if resp.status_code == 403:
                raise ConnectionFailedError("OSDU Authorization failed (403) - Check Partition ID or Token Scopes")
            
            resp.raise_for_status()
            
            # Optional: Log the groups the user belongs to for debug
            groups = resp.json().get("groups", [])
            logger.info(f"Connected to OSDU. User belongs to {len(groups)} groups.")
            
            return True
        except Exception as e:
            logger.error(f"OSDU Connection Test Failed: {e}")
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Discovers 'Kinds' (Schemas) available in the OSDU instance.
        """
        try:
            url = f"{self.base_url}/api/search/v2/query"
            payload = {
                "kind": "*:*:*:*",
                "aggregateBy": "kind",
                "limit": 1,
                "query": pattern if pattern else "*"
            }
            resp = requests.post(url, headers=self.headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            assets = []
            if "aggregations" in data:
                for bucket in data.get("aggregations", []):
                    kind = bucket.get("key")
                    count = bucket.get("count")
                    if not kind:
                        continue

                    # Improved OSDU Kind Parsing
                    # Format: authority:source:entity_type:version
                    parts = kind.split(":")
                    authority = parts[0] if len(parts) > 0 else "osdu"
                    source = parts[1] if len(parts) > 1 else "wks"
                    full_type = parts[2] if len(parts) > 2 else kind
                    version = parts[3] if len(parts) > 3 else ""

                    group = "other"
                    entity = full_type
                    if "--" in full_type:
                        type_parts = full_type.split("--")
                        group = type_parts[0]
                        entity = type_parts[1]
                    
                    asset_meta = {
                        "authority": authority,
                        "source": source,
                        "entity_type": full_type,
                        "group": group,
                        "entity_name": entity,
                        "version": version,
                        "full_kind": kind
                    }

                    if include_metadata:
                        # Fetch sample to get a glimpse of ACLs/Legal tags
                        sample = self.fetch_sample(kind, limit=1)
                        if sample:
                            record = sample[0]
                            asset_meta["acl"] = record.get("acl", {})
                            asset_meta["legal"] = record.get("legal", {})
                            asset_meta["tags"] = record.get("tags", {})

                    assets.append({
                        "name": kind,
                        "type": "kind",
                        "rows": count,
                        "schema": authority,
                        "metadata": asset_meta
                    })
            return assets
        except Exception as e:
            logger.error(f"Failed to discover OSDU assets: {e}")
            raise

    def get_legal_tags(self) -> List[Dict[str, Any]]:
        """
        Fetches all legal tags from the Legal Service.
        """
        url = f"{self.base_url}/api/legal/v1/legaltags"
        resp = requests.get(url, headers=self.headers)
        resp.raise_for_status()
        return resp.json().get("legalTags", [])

    def get_schema(self, kind: str) -> Dict[str, Any]:
        """
        Fetches the full JSON schema for a given kind from the Schema Service.
        """
        url = f"{self.base_url}/api/schema-service/v1/schema/{kind}"
        resp = requests.get(url, headers=self.headers)
        resp.raise_for_status()
        return resp.json()

    def get_record(self, record_id: str) -> Dict[str, Any]:
        """
        Fetches a specific record from the Storage Service.
        """
        url = f"{self.base_url}/api/storage/v2/records/{record_id}"
        resp = requests.get(url, headers=self.headers)
        resp.raise_for_status()
        return resp.json()

    def get_dataset_url(self, dataset_registry_id: str) -> str:
        """
        Resolves a Dataset Registry ID (e.g., 'opendes:dataset--File.Generic:123')
        to a signed download URL via the Dataset/File Service.
        """
        # Note: API paths vary slightly between OSDU versions (dataset/v1 vs file/v2).
        # We assume the standard Dataset Service 'retrievalInstructions' endpoint.
        url = f"{self.base_url}/api/dataset/v1/getRetrievalInstructions"
        payload = {
            "datasetRegistryIds": [dataset_registry_id]
        }
        
        resp = requests.post(url, headers=self.headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        
        datasets = data.get("datasets", [])
        if not datasets:
            raise ValueError(f"No retrieval instructions found for {dataset_registry_id}")
            
        # Standard OSDU response format: { "retrievalProperties": { "signedUrl": "..." } }
        instructions = datasets[0].get("retrievalProperties", {})
        signed_url = instructions.get("signedUrl")
        
        if not signed_url:
             raise ValueError(f"No signed URL in retrieval instructions for {dataset_registry_id}")
             
        return signed_url

    def infer_schema(
        self,
        asset: str,
        sample_size: int = 1000,
        mode: str = "auto",
        **kwargs,
    ) -> Dict[str, Any]:
        try:
            schema_url = f"{self.base_url}/api/schema-service/v1/schema/{asset}"
            resp = requests.get(schema_url, headers=self.headers)
            if resp.status_code == 200:
                schema_def = resp.json()
                properties = schema_def.get("properties", {})
                columns = []
                for prop_name, prop_meta in properties.items():
                    columns.append({
                        "name": prop_name,
                        "type": prop_meta.get("type", "string"),
                        "nullable": True
                    })
                return {"columns": columns}
        except Exception:
            logger.warning(f"Could not fetch formal schema for {asset}, falling back to inference.")

        sample = self.fetch_sample(asset, limit=10)
        if not sample:
            return {"columns": []}
        
        df = pd.DataFrame(sample)
        return {"columns": [{"name": c, "type": str(df[c].dtype)} for c in df.columns]}

    def read_batch(
        self,
        asset: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> Iterator[pd.DataFrame]:
        """
        Reads data using Search Service with Cursor-based pagination.
        Optionally resolves dataset URLs if 'resolve_datasets=True' is passed.
        """
        url = f"{self.base_url}/api/search/v2/query"
        cursor = None
        total_fetched = 0
        batch_size = kwargs.get("batch_size", 1000)
        resolve_datasets = kwargs.get("resolve_datasets", False)
        
        if limit and limit < batch_size:
            batch_size = limit

        while True:
            payload = {
                "kind": asset,
                "limit": batch_size,
                "query": kwargs.get("query", "*")
            }
            if cursor:
                payload["cursor"] = cursor
            
            resp = requests.post(url, headers=self.headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            results = data.get("results", [])
            if not results:
                break
                
            df = pd.DataFrame(results)
            
            # Flatten 'data' field
            if "data" in df.columns:
                data_df = pd.json_normalize(df["data"])
                # Handle potential duplicate columns during join by suffixing
                df = df.drop(columns=["data"]).join(data_df, rsuffix="_data")

            # Feature: Automatically resolve Dataset URLs if requested
            # This is useful for 'dataset--File.*' kinds
            if resolve_datasets and "id" in df.columns:
                # Note: Doing this row-by-row is slow; in production, use batch endpoints
                # or async parallel requests. For now, we do a simple sequential try.
                urls = []
                for _, row in df.iterrows():
                    try:
                        # Only try if it looks like a dataset
                        if ":dataset--" in str(row["id"]):
                            urls.append(self.get_dataset_url(row["id"]))
                        else:
                            urls.append(None)
                    except Exception:
                        urls.append(None)
                df["_signed_url"] = urls
            
            yield df
            
            total_fetched += len(results)
            if limit and total_fetched >= limit:
                break
                
            cursor = data.get("cursor")
            if not cursor:
                break

    def write_batch(
        self,
        data: pd.DataFrame,
        asset: str,
        mode: str = "append",
        **kwargs,
    ) -> int:
        raise NotImplementedError("OSDU Write requires Storage Service + Legal/ACL compliance.")

    def execute_query(
        self,
        query: str,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        kind = kwargs.get("kind", "*:*:*:*")
        url = f"{self.base_url}/api/search/v2/query"
        payload = {
            "kind": kind,
            "query": query,
            "limit": limit or 100
        }
        resp = requests.post(url, headers=self.headers, json=payload)
        resp.raise_for_status()
        return resp.json().get("results", [])
