from typing import Any, Dict, List, Iterator, Optional
import re
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

                    assets.append({
                        "name": kind,
                        "type": "osdu_kind",
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

    def get_relationships(self, kind: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Resolves inter-entity relationships by analyzing the technical schema.
        Recursively walks the schema document, resolves local $refs, and extracts 
        OSDU-specific relationship metadata from properties and inherited definitions.
        """
        logger.info(f"Resolving OSDU relationships for kind: {kind}")
        try:
            raw_resp = self.get_schema(kind)
        except Exception as e:
            logger.error(f"Failed to fetch schema for relationships of {kind}: {e}")
            return []

        if not isinstance(raw_resp, dict):
            return []

        # OSDU Schema Service often wraps the actual schema in a 'schema' or 'metadata' key
        schema = raw_resp.get("schema") or raw_resp.get("metadata") or raw_resp
        
        # Aggregate all definitions from the entire document for $ref resolution
        # JSON Schema standard uses 'definitions' or '$defs'
        definitions = schema.get("definitions") or schema.get("$defs") or {}
        if isinstance(raw_resp, dict) and not definitions:
            definitions = raw_resp.get("definitions") or raw_resp.get("$defs") or {}

        rels = []
        seen_keys = set()

        # Extract context from the current kind to resolve relative links in raw schemas
        parts = kind.split(":")
        curr_authority = parts[0] if len(parts) > 0 else "osdu"
        curr_source = parts[1] if len(parts) > 1 else "wks"

        def extract_rel(name: str, meta: Dict[str, Any]):
            nonlocal seen_keys, rels
            if not isinstance(meta, dict):
                return
                
            target_kind = None
            entity_type = None
            group_type = None

            # 1. x-osdu-relationship (Primary OSDU metadata)
            osdu_rels = meta.get("x-osdu-relationship")
            if osdu_rels:
                # Handle both list (standard) and single-object formats
                if isinstance(osdu_rels, dict):
                    osdu_rels = [osdu_rels]
                
                if isinstance(osdu_rels, list) and len(osdu_rels) > 0:
                    rel = osdu_rels[0]
                    entity_type = rel.get("EntityType")
                    group_type = rel.get("GroupType")
                    if entity_type and group_type:
                        # Construct a best-guess kind for navigation
                        if curr_authority == "osdu":
                            target_kind = f"osdu:wks:{group_type}--{entity_type}:1.0.0"
                        else:
                            target_kind = f"{curr_authority}:{curr_source}:{group_type}--{entity_type}:1.0.0"

            # 2. pattern-based extraction (Secondary)
            if not target_kind:
                pattern = meta.get("pattern")
                if pattern and isinstance(pattern, str):
                    # Clean regex noise from OSDU patterns
                    clean_pattern = pattern.replace('\\', '').replace('^', '').replace('$', '')
                    
                    # Try authority:source:group--entity:version
                    match = re.search(r"([\w\-\.]+):([\w\-\.]+):([\w\-\.]+--[\w\-\.]+):([\d\.\*]*)", clean_pattern)
                    if match:
                        target_kind = f"{match.group(1)}:{match.group(2)}:{match.group(3)}:1.0.0"
                        entity_type = match.group(3).split("--")[-1]
                    else:
                        # Try group--entity
                        match = re.search(r"([\w\-\.]+)--([\w\-\.]+)", clean_pattern)
                        if match:
                            group_type = match.group(1)
                            entity_type = match.group(2)
                            target_kind = f"osdu:wks:{group_type}--{entity_type}:1.0.0"

            # 3. x-osdu-inheriting-from-kind (OSDU Inheritance metadata)
            if not target_kind:
                inherits = meta.get("x-osdu-inheriting-from-kind")
                if inherits and isinstance(inherits, list) and len(inherits) > 0:
                    target_kind = inherits[0].get("kind")
                    if target_kind:
                        p = target_kind.split(":")
                        if len(p) > 2:
                            entity_type = p[2].split("--")[-1]

            # 4. Heuristics (Fallback based on ID suffix and description)
            if not target_kind and isinstance(name, str) and name.endswith("ID"):
                desc = str(meta.get("description", ""))
                if "osdu:wks:" in desc:
                    match = re.search(r"osdu:wks:([\w\-\.]+--[\w\-\.]+):([\d\.]+)", desc)
                    if match: 
                        target_kind = f"osdu:wks:{match.group(1)}:{match.group(2)}"
                        entity_type = match.group(1).split("--")[-1]

            if target_kind and f"{name}-{target_kind}" not in seen_keys:
                # Heuristic: Categorize relationships
                category = "Core"
                tech_keywords = ["region", "status", "classification", "curation", "existence", "assurance", "alias", "unit", "crs"]
                if any(k in target_kind.lower() for k in tech_keywords) or any(k in name.lower() for k in tech_keywords):
                    category = "Technical"
                elif "reference-data" in target_kind:
                    category = "Technical"

                rels.append({
                    "field": name,
                    "targetKind": target_kind,
                    "entityType": entity_type or target_kind.split(":")[-2].split("--")[-1],
                    "groupType": group_type,
                    "category": category,
                    "description": meta.get("description", "Semantic domain relationship")
                })
                seen_keys.add(f"{name}-{target_kind}")

        def walk(obj: Any, parent_name: str = "", depth: int = 0):
            if depth > 40 or not isinstance(obj, dict):
                return

            # Check this node for relationship tags
            if parent_name:
                extract_rel(parent_name, obj)

            # 1. Traverse standard properties
            if "properties" in obj:
                for p_name, p_meta in obj["properties"].items():
                    walk(p_meta, p_name, depth + 1)
            
            # 2. Traverse definitions
            for def_key in ["definitions", "$defs"]:
                if def_key in obj:
                    for d_name, d_meta in obj[def_key].items():
                        walk(d_meta, d_name, depth + 1)

            # 3. Follow $refs
            ref = obj.get("$ref")
            if ref and isinstance(ref, str) and "#/" in ref:
                ref_name = ref.split("/")[-1]
                resolved = definitions.get(ref_name)
                if resolved:
                    walk(resolved, parent_name, depth + 1)

            # 4. Traverse composition structures
            for key in ["allOf", "oneOf", "anyOf"]:
                if key in obj:
                    for sub in obj[key]:
                        walk(sub, parent_name, depth + 1)
            
            # 5. Traverse array items
            if "items" in obj:
                walk(obj["items"], parent_name, depth + 1)

        # Start recursive discovery
        extract_rel("Inheritance", schema)
        walk(schema)
        return rels

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
        """
        Production-level schema inference for OSDU.
        Attempts to fetch from Schema Service first, then falls back to Storage samples.
        """
        columns = []
        schema_def = {}
        row_count = 0

        # 1. Attempt to fetch formal schema from Schema Service
        try:
            schema_url = f"{self.base_url}/api/schema-service/v1/schema/{asset}"
            resp = requests.get(schema_url, headers=self.headers, timeout=10)
            if resp.status_code == 200:
                schema_def = resp.json()
                properties = schema_def.get("properties", {})
                for prop_name, prop_meta in properties.items():
                    columns.append({
                        "name": prop_name,
                        "type": prop_meta.get("type", "string"),
                        "native_type": prop_meta.get("type", "string"),
                        "description": prop_meta.get("description"),
                        "nullable": True
                    })
                
                # If we got formal columns, return early if mode isn't 'sample'
                if columns and mode != "sample":
                    return {
                        "asset": asset,
                        "columns": columns,
                        "metadata": schema_def
                    }
        except Exception as e:
            logger.warning(f"OSDU Schema Service lookup failed for {asset}: {e}")

        # 2. Fallback or Complement: Fetch sample records from Search Service
        try:
            url = f"{self.base_url}/api/search/v2/query"
            payload = {
                "kind": asset,
                "limit": 5,
                "query": "*"
            }
            resp = requests.post(url, headers=self.headers, json=payload, timeout=10)
            if resp.status_code == 200:
                search_data = resp.json()
                row_count = search_data.get("totalCount", 0)
                results = search_data.get("results", [])
                
                if results and not columns:
                    # Infer columns from the first few records
                    df = pd.json_normalize([r.get("data", {}) for r in results])
                    for col in df.columns:
                        dtype = str(df[col].dtype).lower()
                        col_type = "string"
                        if "int" in dtype: col_type = "integer"
                        elif "float" in dtype: col_type = "float"
                        elif "bool" in dtype: col_type = "boolean"
                        elif "datetime" in dtype: col_type = "datetime"
                        
                        columns.append({
                            "name": col,
                            "type": col_type,
                            "native_type": dtype,
                            "nullable": True
                        })
        except Exception as e:
            logger.warning(f"OSDU Search Service sampling failed for {asset}: {e}")

        return {
            "asset": asset,
            "columns": columns,
            "row_count_estimate": row_count,
            "schema_metadata": schema_def
        }

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
            if resolve_datasets and "id" in df.columns:
                urls = []
                for _, row in df.iterrows():
                    try:
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
        """
        Writes data to OSDU Storage Service.
        Requires 'acl' and 'legal' in kwargs or as columns in the DataFrame.
        """
        if data.empty:
            return 0

        # OSDU requires specific metadata for every record
        acl = kwargs.get("acl") or self.config.get("default_acl")
        legal = kwargs.get("legal") or self.config.get("default_legal")

        if not acl or not legal:
            raise ConfigurationError("OSDU Write requires 'acl' and 'legal' metadata.")

        records = []
        for _, row in data.iterrows():
            # Convert row to OSDU record format
            # Row index or a specific column can be used as the ID component
            record_id = f"{self.config['data_partition_id']}:{asset}:{hash(str(row))}"
            
            record = {
                "id": record_id,
                "kind": asset,
                "acl": acl,
                "legal": legal,
                "data": row.where(pd.notnull(row), None).to_dict()
            }
            records.append(record)

        # Storage Service supports batch put
        url = f"{self.base_url}/api/storage/v2/records"
        
        # OSDU typically has a limit on batch size (e.g. 500 records)
        batch_size = 500
        total_written = 0
        
        for i in range(0, len(records), batch_size):
            chunk = records[i:i + batch_size]
            resp = requests.put(url, headers=self.headers, json=chunk, timeout=30)
            resp.raise_for_status()
            # Storage service returns list of recordIds created
            total_written += len(resp.json().get("recordIds", []))

        return total_written

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
