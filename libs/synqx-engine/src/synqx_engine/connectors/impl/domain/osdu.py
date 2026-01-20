from collections.abc import Iterator
from typing import Any

import pandas as pd
from synqx_core.errors import ConfigurationError
from synqx_core.logging import get_logger

from synqx_engine.connectors.base import BaseConnector
from synqx_engine.domains.osdu import (
    OSDUCoreService,
    OSDUFileService,
    OSDUGovernanceService,
    OSDURefService,
    OSDUWellboreService,
)

logger = get_logger(__name__)


class OSDUConnector(BaseConnector):
    """
    Overhauled Facade-based OSDU Connector.
    Segregates service logic into specialized Domain modules while
    providing a unified interface for Synqx Engine and UI.
    """

    def validate_config(self) -> None:
        required = ["osdu_url", "data_partition_id", "auth_token"]
        missing = [k for k in required if not self.config.get(k)]
        if missing:
            raise ConfigurationError(f"Missing OSDU config: {missing}")

        url = self.config["osdu_url"]
        partition = self.config["data_partition_id"]
        token = self.config["auth_token"]

        # Initialize Specialized Domain Services
        self.core = OSDUCoreService(url, partition, token)
        self.file = OSDUFileService(url, partition, token)
        self.gov = OSDUGovernanceService(url, partition, token)
        self.wellbore = OSDUWellboreService(url, partition, token)
        self.ref = OSDURefService(url, partition, token)

    def connect(self) -> None:
        pass

    def disconnect(self) -> None:
        pass

    def test_connection(self) -> dict[str, bool]:
        """
        Verifies connectivity via Entitlements service.
        """
        try:
            groups = self.gov.get_groups()
            logger.info(f"OSDU Heartbeat Success. User has {len(groups)} entitlements.")
            return {"success": True}
        except Exception as e:
            logger.error(f"OSDU Heartbeat Failed: {e}")
            return {"success": False}

    def discover_assets(
        self, pattern: str | None = None, **kwargs
    ) -> list[dict[str, Any]]:
        """
        Discovers Kinds (Schemas) using Search Service aggregations.
        """
        aggregations = self.core.aggregate_by_kind(pattern or "*")
        assets = []
        for bucket in aggregations:
            kind = bucket.get("key")
            if not kind:
                continue

            # Robust count extraction: OSDU uses 'count', ES uses 'doc_count'
            count = bucket.get("count")
            if count is None:
                count = bucket.get("doc_count")

            # Ensure count is a valid number
            try:
                final_count = int(count) if count is not None else 0
            except (ValueError, TypeError):
                final_count = 0

            # Extract technical metadata for UI registration
            parts = kind.split(":")
            assets.append(
                {
                    "name": kind,
                    "type": "osdu_kind",
                    "rows": final_count,
                    "schema": parts[0] if len(parts) > 0 else "osdu",
                    "metadata": {
                        "full_kind": kind,
                        "entity_name": parts[2].split("--")[-1]
                        if len(parts) > 2  # noqa: PLR2004
                        else kind,
                        "group": parts[2].split("--")[0]
                        if len(parts) > 2 and "--" in parts[2]  # noqa: PLR2004
                        else "other",
                        "authority": parts[0] if len(parts) > 0 else "osdu",
                        "source": parts[1] if len(parts) > 1 else "wks",
                        "version": parts[3] if len(parts) > 3 else "1.0.0",  # noqa: PLR2004
                        "rows": final_count,
                    },
                }
            )
        return assets

    def infer_schema(self, asset: str, **kwargs) -> dict[str, Any]:
        """
        Resolves schema from Schema Service with Storage sampling fallback.
        """
        return self.core.get_schema(asset)

    # --- Engine Batch Operations ---

    def read_batch(
        self, asset: str, limit: int | None = None, **kwargs
    ) -> Iterator[pd.DataFrame]:
        """
        Engine implementation for reading data via Search Service.
        """
        # Internal iterator logic for search cursor
        batch_size = kwargs.get("batch_size", 1000)
        total_fetched = 0
        cursor = None

        while True:
            params = {
                "kind": asset,
                "limit": batch_size,
                "query": kwargs.get("query", "*"),
            }
            if cursor:
                params["cursor"] = cursor

            resp = self.core.search(**params)
            results = resp.get("results", [])
            if not results:
                break

            df = pd.DataFrame(results)
            if "data" in df.columns:
                df = df.drop(columns=["data"]).join(
                    pd.json_normalize(df["data"]), rsuffix="_data"
                )

            yield df
            total_fetched += len(results)
            if limit and total_fetched >= limit:
                break
            cursor = resp.get("cursor")
            if not cursor:
                break

    def write_batch(self, data: pd.DataFrame, asset: str, **kwargs) -> int:
        """
        Engine implementation for writing records to Storage Service.
        """
        if data.empty:
            return 0

        # Auto-provision Kind if requested and missing
        if kwargs.get("auto_create_schema"):
            self._provision_kind_if_needed(asset, data)

        # Resolve governance metadata
        acl = kwargs.get("acl") or self.config.get("default_acl")
        legal = kwargs.get("legal") or self.config.get("default_legal")

        if not acl or not legal:
            raise ConfigurationError(
                f"Missing OSDU Governance metadata (acl/legal) for Kind '{asset}'"
            )

        # Handle 'overwrite' strategy: Delete existing records of this kind
        mode = kwargs.get("mode", "append")
        if mode == "overwrite":
            logger.info(f"OSDU Strategy: OVERWRITE active for Kind '{asset}'. Purging existing records...")
            # We search for all IDs of this kind and delete them
            try:
                # Use a loop to handle potential search result limits
                while True:
                    search_res = self.core.search(kind=asset, returnedFields=["id"], limit=1000)
                    ids_to_delete = [r["id"] for r in search_res.get("results", [])]
                    if not ids_to_delete:
                        break
                    
                    for rid in ids_to_delete:
                        self.core.delete_record(rid)
                    
                    logger.debug(f"  Purged batch of {len(ids_to_delete)} records.")
                    if len(ids_to_delete) < 1000:
                        break
            except Exception as e:
                logger.warning(f"OSDU Overwrite purge failed: {e}. Proceeding with ingestion.")

        # Prepare records for ingestion
        records = []
        for _, row in data.iterrows():
            # ID Generation Strategy: 
            # 1. Use provided 'id' if exists
            # 2. Use 'id' from config mapping (logical primary key)
            # 3. Fallback to deterministic hash of the entire row
            
            pk_col = kwargs.get("primary_key") or "id"
            row_id = str(row.get(pk_col)) if row.get(pk_col) else hashlib.sha256(str(row.to_dict()).encode()).hexdigest()[:16]
            
            # Ensure the ID follows OSDU format: data-partition-id:kind:record-id
            full_id = f"{self.config['data_partition_id']}:{asset}:{row_id}"

            records.append(
                {
                    "id": full_id,
                    "kind": asset,
                    "acl": acl,
                    "legal": legal,
                    "data": row.where(pd.notnull(row), None).to_dict(),
                }
            )

        # Batch ingestion via Storage Service (Standard OSDU pattern)
        # Note: Large batches might need to be split into chunks of 500-1000
        chunk_size = 500
        total_ingested = 0
        for i in range(0, len(records), chunk_size):
            batch = records[i:i + chunk_size]
            ids = self.core.upsert_records(batch)
            total_ingested += len(ids)

        return total_ingested

    def _provision_kind_if_needed(self, kind: str, df: pd.DataFrame) -> None:
        """
        Verifies Kind existence and registers a new schema if missing.
        """
        try:
            # Check if schema exists
            self.core.get_schema(kind)
            logger.debug(f"OSDU Kind '{kind}' already exists. Skipping provision.")
        except Exception:
            logger.info(f"OSDU Kind '{kind}' not found. Initiating auto-provisioning...")
            
            # Map pandas/numpy types to OSDU/JSON types
            properties = {}
            for col, dtype in df.dtypes.items():
                dt = str(dtype).lower()
                if "int" in dt:
                    properties[col] = {"type": "integer"}
                elif "float" in dt or "double" in dt:
                    properties[col] = {"type": "number"}
                elif "bool" in dt:
                    properties[col] = {"type": "boolean"}
                elif "datetime" in dt:
                    properties[col] = {"type": "string", "format": "date-time"}
                else:
                    properties[col] = {"type": "string"}

            # Construct OSDU Schema object
            parts = kind.split(":")
            schema_obj = {
                "kind": kind,
                "schemaInfo": {
                    "schemaIdentity": {
                        "authority": parts[0],
                        "source": parts[1],
                        "entityType": parts[2].split("--")[-1] if "--" in parts[2] else parts[2],
                        "schemaVersionMajor": 1,
                        "schemaVersionMinor": 0,
                        "schemaVersionPatch": 0
                    },
                    "status": "PUBLISHED"
                },
                "schema": {
                    "x-osdu-license": "Copyright 2024, SLB",
                    "x-osdu-schema-source": "Synqx-AutoProvision",
                    "type": "object",
                    "properties": {
                        "data": {
                            "type": "object",
                            "properties": properties
                        }
                    }
                }
            }
            
            try:
                self.core.create_schema(schema_obj)
                logger.info(f"Successfully provisioned OSDU Kind: {kind}")
            except Exception as e:
                logger.error(f"Failed to auto-provision OSDU Kind '{kind}': {e}")
                raise ConfigurationError(f"Target Kind '{kind}' does not exist and auto-provision failed: {e}")

    # --- Generic Metadata & Action Dispatcher ---

    def execute_action(self, action: str, params: dict[str, Any]) -> Any:
        """
        Dynamic dispatcher for UI-driven service actions.
        Enables the Frontend to call any method on core, file, gov, wellbore, or ref services.
        """  # noqa: E501
        # 1. Check sub-services
        for service in [self.core, self.file, self.gov, self.wellbore, self.ref]:
            if hasattr(service, action):
                method = getattr(service, action)
                return method(**params)

        # 2. Check the connector instance itself
        if hasattr(self, action):
            method = getattr(self, action)
            return method(**params)

        raise AttributeError(
            f"Action '{action}' not implemented in any OSDU service module."
        )

    def execute_query(
        self,
        query: str = "*",
        limit: int | None = None,
        offset: int | None = None,
        **kwargs,
    ) -> dict[str, Any]:
        """
        Executes a Lucene search query against OSDU.
        Returns a dictionary with 'results' and 'total_count'.
        """
        # Extract kind from kwargs if present, otherwise default. Ensure it's never None.  # noqa: E501
        kind = kwargs.pop("kind", "*:*:*:*") or "*:*:*:*"

        limit = limit if limit is not None else 100
        offset = offset if offset is not None else 0

        resp = self.core.search(
            kind=kind, query=query, limit=limit, offset=offset, **kwargs
        )
        return {
            "results": resp.get("results", []),
            "total_count": resp.get("totalCount", 0),
            "cursor": resp.get("cursor"),
        }

    def execute_cursor_query(self, cursor: str, **kwargs) -> dict[str, Any]:
        """
        Executes a search using an OSDU cursor for deep pagination.
        """
        resp = self.core.query_with_cursor(cursor=cursor, **kwargs)
        return {
            "results": resp.get("results", []),
            "total_count": resp.get("totalCount", 0),
            "cursor": resp.get("cursor"),
        }

    def get_total_count(
        self, query_or_asset: str, is_query: bool = False, **kwargs
    ) -> int | None:
        """
        Efficiently fetches the total count for a query or asset.
        """
        kind = kwargs.get("kind", "*:*:*:*") or "*:*:*:*"
        resp = self.core.search(kind=kind, query=query_or_asset, limit=0)
        return resp.get("totalCount")

    def download_file(self, path: str = "", **kwargs) -> bytes:
        """
        Implementation for OSDU file downloads.
        Prioritizes 'file_id' from kwargs.
        """
        file_id = kwargs.get("file_id") or path
        if not file_id:
            raise ValueError("file_id or path must be provided for OSDU download")
        return self.file.download_file(file_id)

    def upload_file(self, content: bytes, filename: str, **kwargs) -> str:
        """
        Implementation for OSDU file uploads using the backend proxy.
        """
        return self.file.upload_file(
            content, filename, kwargs.get("content_type", "application/octet-stream")
        )

    def __getattr__(self, name: str):
        """
        Delegates missing methods to specialized sub-services.
        Allows direct access to methods like `get_groups()` or `get_legal_tags()`.
        """
        # Avoid infinite recursion for internal lookups
        if name.startswith("_") or name in ["core", "file", "gov", "wellbore", "ref"]:
            raise AttributeError(
                f"'{type(self).__name__}' object has no attribute '{name}'"
            )

        # Safely iterate through sub-services
        services = []
        for s in ["core", "file", "gov", "wellbore", "ref"]:
            svc = self.__dict__.get(s)
            if svc:
                services.append(svc)

        for service in services:
            if hasattr(service, name):
                return getattr(service, name)

        raise AttributeError(
            f"'{type(self).__name__}' object has no attribute '{name}'"
        )
