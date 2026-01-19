from typing import Any, Dict, List, Optional
from .base import OSDUBaseClient

class OSDUCoreService(OSDUBaseClient):
    """
    Search, Storage, and Schema services implementation.
    """
    
    # --- Search Service ---
    def search(self, kind: str = "*:*:*:*", query: str = "*", limit: int = 100, offset: int = 0, **kwargs) -> Dict[str, Any]:
        # Robustness: ensure kind is never None or empty
        safe_kind = kind or "*:*:*:*"
        
        # Strip internal Synqx metadata that OSDU parser rejects
        clean_kwargs = {
            k: v for k, v in kwargs.items() 
            if k in ["aggregateBy", "spatialFilter", "returnedFields", "sort", "trackTotalCount"]
        }
        
        # OSDU Limit/Offset Boundaries
        safe_limit = min(limit, 1000)
        safe_offset = max(offset, 0)

        payload = {
            "kind": safe_kind,
            "query": query,
            "limit": safe_limit,
            "offset": safe_offset,
            "trackTotalCount": True,
            **clean_kwargs
        }
        return self._post("api/search/v2/query", json=payload).json()

    def query_with_cursor(self, cursor: str, **kwargs) -> Dict[str, Any]:
        """
        POST api/search/v2/query_with_cursor
        Used for deep pagination when offset > 10,000 or for better performance.
        """
        payload = {
            "cursor": cursor,
            **kwargs
        }
        return self._post("api/search/v2/query_with_cursor", json=payload).json()

    def aggregate_by_kind(self, pattern: str = "*") -> List[Dict[str, Any]]:
        payload = {
            "kind": "*:*:*:*",
            "query": pattern,
            "aggregateBy": "kind",
            "limit": 0
        }
        return self._post("api/search/v2/query", json=payload).json().get("aggregations", [])

    # --- Storage Service ---
    def get_record(self, record_id: str) -> Dict[str, Any]:
        return self._get(f"api/storage/v2/records/{record_id}").json()

    def delete_record(self, record_id: str):
        self._delete(f"api/storage/v2/records/{record_id}")

    def get_record_versions(self, record_id: str) -> List[int]:
        return self._get(f"api/storage/v2/records/versions/{record_id}").json().get("versions", [])

    def get_ancestry(self, record_id: str) -> Dict[str, Any]:
        record = self.get_record(record_id)
        ancestry = record.get("ancestry", {})
        return {
            "record_id": record_id,
            "parents": ancestry.get("parents", []),
            "kind": record.get("kind"),
            "raw_ancestry": ancestry
        }

    def get_record_relationships(self, record_id: str) -> Dict[str, Any]:
        """
        Derives relationships by parsing data fields (outbound) 
        and querying for references (inbound).
        """
        record = self.get_record(record_id)
        data = record.get("data", {})
        
        # 1. Outbound: Find all fields ending in ID or containing [something]ID
        outbound = []
        for key, value in data.items():
            if (key.endswith("ID") or "ID" in key) and isinstance(value, str) and ":" in value:
                outbound.append({
                    "field": key,
                    "target_id": value
                })

        # 2. Inbound: Search for records referencing this ID in any field
        # OSDU Search supports 'data.field: "id"' or just 'id' in broad search
        try:
            # We search across all kinds for this specific record ID in any data field
            inbound_resp = self.search(
                query=f"\"{record_id}\"", 
                limit=100
            )
            inbound = [
                {
                    "source_id": r.get("id"),
                    "kind": r.get("kind")
                } 
                for r in inbound_resp.get("results", [])
                if r.get("id") != record_id # Exclude self
            ]
        except Exception as e:
            logger.warning(f"Failed to fetch inbound relationships for {record_id}: {e}")
            inbound = []

        return {
            "record_id": record_id,
            "outbound": outbound,
            "inbound": inbound
        }

    def get_spatial_data(self, record_id: str) -> Optional[Dict[str, Any]]:
        record = self.get_record(record_id)
        data = record.get("data", {})
        spatial = data.get("SpatialLocation", {}) or data.get("SpatialArea", {})
        return spatial.get("Wgs84Coordinates")

    def upsert_records(self, records: List[Dict[str, Any]]) -> List[str]:
        return self._put("api/storage/v2/records", json=records).json().get("recordIds", [])

    # --- Schema Service ---
    def get_schema(self, kind: str) -> Dict[str, Any]:
        return self._get(f"api/schema-service/v1/schema/{kind}").json()

    def list_schemas(self, authority: Optional[str] = None, source: Optional[str] = None) -> List[str]:
        params = {}
        if authority: params["authority"] = authority
        if source: params["source"] = source
        return self._get("api/schema-service/v1/schema", params=params).json()