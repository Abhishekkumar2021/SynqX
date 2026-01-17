from typing import Any, Dict, List, Optional
from synqx_engine.connectors.impl.sql.oracle import OracleConnector
from synqx_core.logging import get_logger

logger = get_logger(__name__)

class ProSourceConnector(OracleConnector):
    """
    Domain-aware connector for SLB ProSource (Seabed/LogDB).
    Provides a semantic layer over the raw Oracle tables, exposing
    logical entities like Wells, Logs, Seismic, and Projects.
    """

    def test_connection(self) -> bool:
        """
        Validates connection to Oracle AND checks for ProSource/Seabed schema markers.
        """
        if not super().test_connection():
            return False
            
        try:
            # Check for ProSource markers
            markers = ["PS_PROJECT", "WELL", "SEABED_VERSION"]
            # Oracle version of 'LIMIT 1' varies, checking existence via user_tables is safer
            query = f"SELECT count(*) as cnt FROM user_tables WHERE table_name IN ({', '.join([f"'{m}'" for m in markers])})"
            res = self.execute_query(query)
            
            if res and res[0]['cnt'] > 0:
                logger.info("ProSource/Seabed schema detected.")
                return True
            else:
                logger.warning("Connected to Oracle, but no ProSource/Seabed tables found in current schema.")
                # We return True because it IS a valid DB connection, but we warn logs.
                # Ideally, we might want to return a warning status, but boolean is strictly True/False.
                return True
        except Exception as e:
            logger.error(f"ProSource validation failed: {e}")
            return False

    def discover_assets(
        self, pattern: Optional[str] = None, include_metadata: bool = False, **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Custom discovery for ProSource.
        Categorizes raw Oracle tables into logical Domain Modules.
        """
        domain_assets = []
        try:
            # Check for PPDM / Seabed Markers
            check_query = "SELECT count(*) as cnt FROM user_tables WHERE table_name IN ('WELL', 'WELL_LOG', 'SEISMIC_LINE')"
            res = self.execute_query(check_query)
            if res and res[0]['cnt'] > 0:
                # We are in a Seabed/PPDM environment.
                # Define logical entities with domain grouping
                entities = [
                    # General / Master Data
                    {"name": "Projects", "module": "General", "table": "PS_PROJECT", "icon": "FolderKanban"},
                    {"name": "Wells", "module": "Well", "table": "WELL", "icon": "Database"},
                    {"name": "Well Nodes", "module": "Well", "table": "WELL_NODE", "icon": "MapPin"},
                    
                    # Log Data
                    {"name": "Log Indexes", "module": "Logs", "table": "WELL_LOG", "icon": "FileStack"},
                    {"name": "Log Curves", "module": "Logs", "table": "WELL_LOG_CURVE", "icon": "Activity"},
                    
                    # Seismic Data
                    {"name": "Seismic Lines", "module": "Seismic", "table": "SEISMIC_LINE", "icon": "Waves"},
                    {"name": "Seismic 3D Surveys", "module": "Seismic", "table": "SEISMIC_3D_SURVEY", "icon": "Box"},
                    
                    # Subsurface / Interpretation
                    {"name": "Markers", "module": "Interpretation", "table": "WELL_MARKER", "icon": "Bookmark"},
                    {"name": "Checkshots", "module": "Interpretation", "table": "CHECKSHOT", "icon": "Timer"},
                ]
                
                for ent in entities:
                    domain_assets.append({
                        "name": ent["name"],
                        "type": "domain_entity",
                        "schema": self.config.get("db_schema") or "SEABED",
                        "metadata": {
                            "module": ent["module"],
                            "table": ent["table"],
                            "icon": ent["icon"],
                            "is_seabed_standard": True
                        }
                    })
                
                if pattern:
                    domain_assets = [a for a in domain_assets if pattern.lower() in a["name"].lower()]
                
                return domain_assets
        except Exception as e:
            logger.warning(f"ProSource semantic discovery failed: {e}. Falling back to raw tables.")

        return super().discover_assets(pattern, include_metadata, **kwargs)

    def infer_schema(
        self,
        asset: str,
        sample_size: int = 1000,
        mode: str = "auto",
        **kwargs,
    ) -> Dict[str, Any]:
        """
        If the asset is a known domain entity (e.g. "Wells"), we map it to the underlying table.
        """
        # Map logical name to physical table
        mapping = {
            "Wells": "WELL",
            "Well Logs": "WELL_LOG",
            "Seismic 2D": "SEISMIC_LINE",
            "Checkshots": "CHECKSHOT"
        }
        
        physical_table = mapping.get(asset, asset)
        return super().infer_schema(physical_table, sample_size, mode, **kwargs)

    def read_batch(self, asset: str, **kwargs):
        # Map logical name to physical table
        mapping = {
            "Wells": "WELL",
            "Well Logs": "WELL_LOG",
            "Seismic 2D": "SEISMIC_LINE",
            "Checkshots": "CHECKSHOT"
        }
        physical_table = mapping.get(asset, asset)
        return super().read_batch(physical_table, **kwargs)
