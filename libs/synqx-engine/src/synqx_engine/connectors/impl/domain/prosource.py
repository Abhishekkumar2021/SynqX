from typing import Any

from synqx_core.logging import get_logger

from synqx_engine.connectors.impl.domain.prosource_queries import (
    Q_CRS_INFO,
    Q_DISCOVER_ASSETS,
    Q_DISCOVER_SCHEMA,
    Q_DOC_FORMAT_STATS,
    Q_DOMAIN_STATS,
    Q_ENTITY_TYPE_STATS,
    Q_INFER_SCHEMA,
    Q_LIST_ACCOUNTS,
    Q_LIST_ALL_DOCUMENTS,
    Q_LIST_CRS,
    Q_LIST_DOCUMENTS,
    Q_LIST_UNITS,
    Q_RELATIONSHIPS_META,
    Q_ROW_COUNT,
    Q_SCHEMA_SOURCE_STATS,
    Q_SCOPE_VALIDATION,
    Q_UNIT_SYSTEM,
)
from synqx_engine.connectors.impl.sql.oracle import OracleConnector

logger = get_logger(__name__)


class ProSourceConnector(OracleConnector):
    """
    Domain-aware connector for SLB ProSource (Seabed/LogDB).
    Provides a semantic layer over the raw Oracle tables, exposing
    logical entities like Wells, Logs, Seismic, and Projects.
    """

    def get_dashboard_diagnostics(self) -> dict[str, Any]:
        """Fetches dynamic distribution data for dashboard visualizations."""
        import time
        start = time.perf_counter()
        
        diag = {
            "doc_formats": [],
            "entity_types": [],
            "schema_sources": [],
            "domain_counts": self.get_domain_stats().get("domains", {}),
            "driver_info": "Oracle Thin Driver",
            "latency_ms": 0
        }
        try:
            diag["doc_formats"] = self.execute_query(self._resolve_query(Q_DOC_FORMAT_STATS))
            diag["entity_types"] = self.execute_query(self._resolve_query(Q_ENTITY_TYPE_STATS))
            diag["schema_sources"] = self.execute_query(self._resolve_query(Q_SCHEMA_SOURCE_STATS))
            
            # Identify driver version if possible
            if self._connection:
                try:
                    diag["driver_info"] = f"Oracle {self._connection.version} Thin"
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Failed to fetch dashboard diagnostics: {e}")
        
        diag["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
        return diag

    def _discover_schemas(self) -> dict[str, str]:
        """
        Discovers both Data Dictionary (DD) and Project/Data schemas.
        Project/Data schema is the project_scope (mapped to project_name) itself.
        DD schema is the 'scope' of that project in SDS_ACCOUNT.
        """
        schemas = {"dd": None, "data": None}
        
        # 1. Map Data Schema directly to project_name (which comes from config field 'project_scope')
        project_name = self.config.get("project_scope") or self.config.get("project_name")
        if project_name:
            schemas["data"] = project_name
            # 2. Discover DD Schema (scope) for this specific project
            try:
                # Use project_name to find its DD scope
                discovery_q = Q_SCOPE_VALIDATION.replace("{PROJECT_NAME}", f"'{project_name}'")
                rows = self.execute_query(discovery_q)
                if rows and rows[0].get("scope"):
                    schemas["dd"] = rows[0]["scope"]
                    logger.info(f"ProSource Context: Project={project_name}, DD={schemas['dd']}")
            except Exception as e:
                logger.warning(f"Failed to find DD scope for project {project_name}: {e}")

        # 3. Fallback for DD Schema if project discovery failed or no project provided
        if not schemas["dd"]:
            try:
                rows = self.execute_query(Q_DISCOVER_SCHEMA)
                if rows:
                    schemas["dd"] = rows[0]["owner"]
            except Exception:
                pass

        return schemas

    def _resolve_query(self, query_template: str, **kwargs) -> str:
        """Resolves placeholders in the query using connection context."""
        schemas = self._discover_schemas()
        
        # Priority: Config > Discovery
        schema_dd = self.config.get("db_schema") or schemas["dd"]
        project_data = self.config.get("project_schema") or schemas["data"]
        project_name = self.config.get("project_scope") or self.config.get("project_name") or "DEMO"

        # Handle prefixing logic: only add dot if schema is present
        project_prefix = f"{project_data}." if project_data else ""
        dd_prefix = f"{schema_dd}." if schema_dd else ""

        query = query_template.replace("{SCHEMA_DD_PREFIX}", dd_prefix)
        query = query.replace("{SCHEMA_DD}", str(schema_dd) if schema_dd else "")
        query = query.replace("{PROJECT_PREFIX}", project_prefix)
        query = query.replace("{PROJECT_NAME}", f"'{project_name}'")

        for k, v in kwargs.items():
            val = str(v) if v is not None else ""
            query = query.replace(f"{{ {k} }}", val)
            query = query.replace(f"{{{k}}}", val)

        return query

    def test_connection(self) -> bool:
        if not super().test_connection():
            return False
        try:
            project_name = self.config.get("project_name")
            if project_name:
                try:
                    res = self.execute_query(self._resolve_query(Q_SCOPE_VALIDATION))
                    if res: return True
                except Exception as e:
                    logger.warning(f"Scope validation failed: {e}")

            markers = ["PS_PROJECT", "WELL", "SEABED_VERSION"]
            query = f"SELECT count(*) as cnt FROM user_tables WHERE table_name IN ({', '.join([f"'{m}'" for m in markers])})"
            res = self.execute_query(query)
            return res and res[0]["cnt"] > 0
        except Exception as e:
            logger.error(f"ProSource validation failed: {e}")
            return False

    def discover_assets(self, pattern: str | None = None, include_metadata: bool = False, **kwargs) -> list[dict[str, Any]]:
        try:
            resolved_q = self._resolve_query(Q_DISCOVER_ASSETS)
            rows = self.execute_query(resolved_q)
            domain_assets = []
            for row in rows:
                name = row["view_name"]
                if pattern and pattern.lower() not in name.lower(): continue
                domain = row.get("domain", "General")
                icon = "Database"
                if domain == "Well": icon = "Database"
                elif domain == "Seismic": icon = "Waves"
                elif domain == "Logs": icon = "FileStack"
                domain_assets.append({
                    "name": name,
                    "type": "domain_entity",
                    "rows": row.get("count"),
                    "schema": self.config.get("db_schema", "SEABED"),
                    "metadata": {
                        "module": domain,
                        "table": row.get("base_entity") or name,
                        "description": row.get("description"),
                        "view_type": row.get("view_type"),
                        "icon": icon,
                        "is_seabed_standard": True,
                    },
                })
            return domain_assets
        except Exception as e:
            logger.warning(f"ProSource discovery failed: {e}")
            return super().discover_assets(pattern, include_metadata, **kwargs)

    def infer_schema(self, asset: str, sample_size: int = 1000, mode: str = "auto", **kwargs) -> dict[str, Any]:
        try:
            resolved_q = self._resolve_query(Q_INFER_SCHEMA, ASSET=asset)
            meta_rows = self.execute_query(resolved_q)
            if meta_rows:
                columns = []
                for row in meta_rows:
                    columns.append({
                        "name": row["attribute"],
                        "type": row["db_type"],
                        "description": row["description"],
                        "native_type": row["db_type"],
                        "nullable": True,
                        "metadata": {"measurement": row["measurement"], "unit": row["unit"]},
                    })
                return {"asset": asset, "columns": columns, "row_count_estimate": 0}
        except Exception as e:
            logger.warning(f"ProSource meta lookup failed for {asset}: {e}")
        return super().infer_schema(asset, sample_size, mode, **kwargs)

    def get_asset_details(self, asset: str) -> dict[str, Any]:
        details = {"name": asset, "physical_table": asset, "rows": 0, "schema_info": {}}
        try:
            q_count = self._resolve_query(Q_ROW_COUNT, ASSET=asset)
            res = self.execute_query(q_count)
            if res: details["rows"] = res[0]["cnt"]
            res_crs = self.execute_query(self._resolve_query(Q_CRS_INFO))
            if res_crs: details["crs"] = res_crs[0]
            res_units = self.execute_query(self._resolve_query(Q_UNIT_SYSTEM))
            if res_units: details["unit_system"] = res_units[0]["namespace"]
        except Exception as e:
            logger.warning(f"Failed to fetch details for {asset}: {e}")
        return details

    def list_crs(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        return self.execute_query(self._resolve_query(Q_LIST_CRS), limit=limit, offset=offset)

    def list_units(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        return self.execute_query(self._resolve_query(Q_LIST_UNITS), limit=limit, offset=offset)

    def list_all_documents(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        return self.execute_query(self._resolve_query(Q_LIST_ALL_DOCUMENTS), limit=limit, offset=offset)

    def list_accounts(self, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        return self.execute_query(self._resolve_query(Q_LIST_ACCOUNTS), limit=limit, offset=offset)

    def list_documents(self, entity_ids: list[str], entity_table: str = "WELL") -> list[dict[str, Any]]:
        if not entity_ids: return []
        ids_str = ", ".join([f"'{eid}'" for eid in entity_ids])
        return self.execute_query(self._resolve_query(Q_LIST_DOCUMENTS, ENTITY_IDS=ids_str))

    def find_relationships(self, asset: str, record: dict[str, Any]) -> list[dict[str, Any]]:
        relationships = []
        try:
            links = self.execute_query(self._resolve_query(Q_RELATIONSHIPS_META, ASSET=asset))
            for link in links:
                source_attr = link.get("source_attribute")
                target_attr = link.get("target_attribute")
                target_entity = link.get("entity_domain")
                val = next((v for k, v in record.items() if k.upper() == source_attr.upper()), None)
                if val:
                    relationships.append({
                        "source": asset, "target": target_entity, "type": link.get("link"),
                        "source_key": source_attr, "target_key": target_attr, "target_value": val,
                        "description": f"Links to {target_entity} via {source_attr}"
                    })
        except Exception as e:
            logger.warning(f"Failed to resolve relationships for {asset}: {e}")
        return relationships

    def get_project_metadata(self) -> dict[str, Any]:
        meta = {"crs": None, "unit_system": None}
        try:
            res_crs = self.execute_query(self._resolve_query(Q_CRS_INFO))
            if res_crs: meta["crs"] = res_crs[0]
            res_units = self.execute_query(self._resolve_query(Q_UNIT_SYSTEM))
            if res_units: meta["unit_system"] = res_units[0].get("namespace")
        except Exception as e:
            logger.warning(f"Failed project meta: {e}")
        return meta

    def get_domain_stats(self) -> dict[str, Any]:
        stats = {"total_entities": 0, "domains": {}}
        try:
            rows = self.execute_query(self._resolve_query(Q_DOMAIN_STATS))
            for r in rows:
                stats["domains"][r["domain"]] = r["count"]
                stats["total_entities"] += r["count"]
        except Exception as e:
            logger.warning(f"Stats failed: {e}")
        return stats
