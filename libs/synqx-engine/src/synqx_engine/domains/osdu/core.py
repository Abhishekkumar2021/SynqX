from typing import Any

from synqx_core.logging import get_logger

from .base import OSDUBaseClient

logger = get_logger(__name__)

class OSDUCoreService(OSDUBaseClient):
    """
    Search, Storage, and Schema services implementation.
    """

    # --- Search Service ---
    def query_with_cursor(self, cursor: str, **kwargs) -> dict[str, Any]:
        """
        POST api/search/v2/query_with_cursor
        Used for deep pagination when offset > 10,000 or for better performance.
        """
        payload = {"cursor": cursor, **kwargs}
        return self._post("api/search/v2/query_with_cursor", json=payload).json()

    def aggregate_by_kind(self, pattern: str = "*") -> list[dict[str, Any]]:
        payload = {
            "kind": "*:*:*:*",
            "query": pattern,
            "aggregateBy": "kind",
            "limit": 0,
        }
        return (
            self._post("api/search/v2/query", json=payload)
            .json()
            .get("aggregations", [])
        )

    def get_record_deep_dive(self, record_id: str) -> dict[str, Any]:
        """
        Orchestrates a comprehensive fetch of all record-related metadata.
        Reduces frontend round-trips from 5 to 1.
        """
        # 1. Primary Record Fetch
        record = self.get_record(record_id)
        
        # 2. Version History (Parallel or sequential, but safe)
        versions = []
        try:
            versions = self.get_record_versions(record_id)
        except Exception:
            pass

        # 3. Relationships & Ancestry (Using already fetched record data)
        # We reuse the logic but pass in the record to avoid re-fetching
        ancestry = {
            "record_id": record_id,
            "parents": record.get("ancestry", {}).get("parents", []),
            "kind": record.get("kind"),
            "raw_ancestry": record.get("ancestry", {}),
        }

        # Spatial data extraction
        data = record.get("data", {})
        spatial = data.get("SpatialLocation", {}) or data.get("SpatialArea", {})
        spatial_coordinates = spatial.get("Wgs84Coordinates")

        # Relationship discovery (Outbound from data, Inbound via Search)
        relationships = self._derive_relationships_from_record(record)

        return {
            "details": record,
            "versions": versions,
            "ancestry": ancestry,
            "spatial": spatial_coordinates,
            "relationships": relationships
        }

    def _derive_relationships_from_record(self, record: dict[str, Any]) -> dict[str, Any]:
        record_id = record.get("id")
        data = record.get("data", {})
        
        outbound = []
        for key, value in data.items():
            if (
                (key.endswith("ID") or "ID" in key)
                and isinstance(value, str)
                and ":" in value
            ):
                outbound.append({"field": key, "target_id": value})

        inbound = []
        try:
            inbound_resp = self.search(query=f'"{record_id}"', limit=50)
            inbound = [
                {"source_id": r.get("id"), "kind": r.get("kind")}
                for r in inbound_resp.get("results", [])
                if r.get("id") != record_id
            ]
        except Exception:
            pass

        return {"record_id": record_id, "outbound": outbound, "inbound": inbound}

    # --- Storage Service ---
    def get_record(self, record_id: str) -> dict[str, Any]:
        """
        Fetches a record from Storage. If 400 or 404, attempts a rescue via Search.
        """
        try:
            return self._get(f"api/storage/v2/records/{record_id}").json()
        except Exception as e:
            # RESCUE: If Storage returns 404 or 400, try to fetch the record via Search
            # 400 can happen if the ID contains characters the router dislikes
            err_str = str(e)
            if "404" in err_str or "400" in err_str:
                logger.info(f"Storage { '404' if '404' in err_str else '400' } for {record_id}. Attempting rescue via Search...")
                try:
                    # We use a strict ID search which is more robust for special characters
                    search_res = self.search(query=f'id: "{record_id}"', limit=1)
                    results = search_res.get("results", [])
                    if results:
                        logger.info(f"Rescue successful for {record_id}")
                        return results[0]
                except Exception as se:
                    logger.warning(f"Rescue failed for {record_id}: {se}")
            
            # Re-raise original if rescue fails or isn't a 404/400
            raise e

    def delete_record(self, record_id: str):
        self._delete(f"api/storage/v2/records/{record_id}")

    def get_record_versions(self, record_id: str) -> list[int]:
        return (
            self._get(f"api/storage/v2/records/versions/{record_id}")
            .json()
            .get("versions", [])
        )

    def get_ancestry(self, record_id: str) -> dict[str, Any]:
        record = self.get_record(record_id)
        ancestry = record.get("ancestry", {})
        return {
            "record_id": record_id,
            "parents": ancestry.get("parents", []),
            "kind": record.get("kind"),
            "raw_ancestry": ancestry,
        }

    def get_record_relationships(self, record_id: str) -> dict[str, Any]:
        """
        Derives relationships by parsing data fields (outbound)
        and querying for references (inbound).
        """
        record = self.get_record(record_id)
        data = record.get("data", {})

        # 1. Outbound: Find all fields ending in ID or containing [something]ID
        outbound = []
        for key, value in data.items():
            if (
                (key.endswith("ID") or "ID" in key)
                and isinstance(value, str)
                and ":" in value
            ):
                outbound.append({"field": key, "target_id": value})

        # 2. Inbound: Search for records referencing this ID in any field
        # OSDU Search supports 'data.field: "id"' or just 'id' in broad search
        try:
            # We search across all kinds for this specific record ID in any data field
            inbound_resp = self.search(query=f'"{record_id}"', limit=100)
            inbound = [
                {"source_id": r.get("id"), "kind": r.get("kind")}
                for r in inbound_resp.get("results", [])
                if r.get("id") != record_id  # Exclude self
            ]
        except Exception as e:
            logger.warning(
                f"Failed to fetch inbound relationships for {record_id}: {e}"
            )
            inbound = []

        return {"record_id": record_id, "outbound": outbound, "inbound": inbound}

    def get_spatial_data(self, record_id: str) -> dict[str, Any] | None:
        record = self.get_record(record_id)
        data = record.get("data", {})
        spatial = data.get("SpatialLocation", {}) or data.get("SpatialArea", {})
        return spatial.get("Wgs84Coordinates")

    def upsert_records(self, records: list[dict[str, Any]]) -> list[str]:
        return (
            self._put("api/storage/v2/records", json=records)
            .json()
            .get("recordIds", [])
        )

    # --- Schema Service ---
    def get_schema(self, kind: str) -> dict[str, Any]:
        return self._get(f"api/schema-service/v1/schema/{kind}").json()

    def create_schema(self, schema_obj: dict[str, Any]) -> dict[str, Any]:
        return self._post("api/schema-service/v1/schema", json=schema_obj).json()

    def delete_schema(self, kind: str):
        self._delete(f"api/schema-service/v1/schema/{kind}")

    def list_schemas(
        self, authority: str | None = None, source: str | None = None
    ) -> list[str]:
        params = {}
        if authority:
            params["authority"] = authority
        if source:
            params["source"] = source
        return self._get("api/schema-service/v1/schema", params=params).json()
