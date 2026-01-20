from typing import Any

from synqx_core.logging import get_logger

from synqx_engine.connectors.impl.sql.oracle import OracleConnector

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
            # Oracle version of 'LIMIT 1' varies, checking existence via user_tables is safer  # noqa: E501
            query = f"SELECT count(*) as cnt FROM user_tables WHERE table_name IN ({', '.join([f"'{m}'" for m in markers])})"  # noqa: E501
            res = self.execute_query(query)

            if res and res[0]["cnt"] > 0:
                logger.info("ProSource/Seabed schema detected.")
                return True
            else:
                logger.warning(
                    "Connected to Oracle, but no ProSource/Seabed tables found in current schema."  # noqa: E501
                )
                # We return True because it IS a valid DB connection, but we warn logs.
                # Ideally, we might want to return a warning status, but boolean is strictly True/False.  # noqa: E501
                return True
        except Exception as e:
            logger.error(f"ProSource validation failed: {e}")
            return False

    def discover_assets(
        self, pattern: str | None = None, include_metadata: bool = False, **kwargs
    ) -> list[dict[str, Any]]:
        """
        Custom discovery for ProSource.
        Categorizes raw Oracle tables into logical Domain Modules.
        """
        domain_assets = []
        try:
            # Check for PPDM / Seabed Markers
            check_query = "SELECT count(*) as cnt FROM user_tables WHERE table_name IN ('WELL', 'WELL_LOG', 'SEISMIC_LINE')"  # noqa: E501
            res = self.execute_query(check_query)
            if res and res[0]["cnt"] > 0:
                # We are in a Seabed/PPDM environment.
                # Define logical entities with domain grouping
                entities = [
                    # General / Master Data
                    {
                        "name": "Projects",
                        "module": "General",
                        "table": "PS_PROJECT",
                        "icon": "FolderKanban",
                    },
                    {
                        "name": "Wells",
                        "module": "Well",
                        "table": "WELL",
                        "icon": "Database",
                    },
                    {
                        "name": "Well Nodes",
                        "module": "Well",
                        "table": "WELL_NODE",
                        "icon": "MapPin",
                    },
                    # Log Data
                    {
                        "name": "Log Indexes",
                        "module": "Logs",
                        "table": "WELL_LOG",
                        "icon": "FileStack",
                    },
                    {
                        "name": "Log Curves",
                        "module": "Logs",
                        "table": "WELL_LOG_CURVE",
                        "icon": "Activity",
                    },
                    # Seismic Data
                    {
                        "name": "Seismic Lines",
                        "module": "Seismic",
                        "table": "SEISMIC_LINE",
                        "icon": "Waves",
                    },
                    {
                        "name": "Seismic 3D Surveys",
                        "module": "Seismic",
                        "table": "SEISMIC_3D_SURVEY",
                        "icon": "Box",
                    },
                    # Subsurface / Interpretation
                    {
                        "name": "Markers",
                        "module": "Interpretation",
                        "table": "WELL_MARKER",
                        "icon": "Bookmark",
                    },
                    {
                        "name": "Checkshots",
                        "module": "Interpretation",
                        "table": "CHECKSHOT",
                        "icon": "Timer",
                    },
                ]

                for ent in entities:
                    # Execute a count query for each table to get row counts
                    row_count = 0
                    try:
                        count_res = self.execute_query(
                            f"SELECT COUNT(*) as row_count FROM {ent['table']}"
                        )
                        if count_res and "row_count" in count_res[0]:
                            row_count = count_res[0]["row_count"]
                    except Exception as count_e:
                        logger.warning(
                            f"Could not fetch row count for {ent['table']}: {count_e}"
                        )

                    domain_assets.append(
                        {
                            "name": ent["name"],
                            "type": "domain_entity",
                            "rows": row_count,
                            "schema": self.config.get("db_schema") or "SEABED",
                            "metadata": {
                                "module": ent["module"],
                                "table": ent["table"],
                                "icon": ent["icon"],
                                "is_seabed_standard": True,
                            },
                        }
                    )

                if pattern:
                    domain_assets = [
                        a for a in domain_assets if pattern.lower() in a["name"].lower()
                    ]

                return domain_assets
        except Exception as e:
            logger.warning(
                f"ProSource semantic discovery failed: {e}. Falling back to raw tables."
            )

        return super().discover_assets(pattern, include_metadata, **kwargs)

    def infer_schema(
        self,
        asset: str,
        sample_size: int = 1000,
        mode: str = "auto",
        **kwargs,
    ) -> dict[str, Any]:
        """
        If the asset is a known domain entity (e.g. "Wells"), we map it to the underlying table.
        """  # noqa: E501
        # Map logical name to physical table
        mapping = {
            "Wells": "WELL",
            "Well Logs": "WELL_LOG",
            "Seismic 2D": "SEISMIC_LINE",
            "Checkshots": "CHECKSHOT",
        }

        physical_table = mapping.get(asset, asset)
        return super().infer_schema(physical_table, sample_size, mode, **kwargs)

    def read_batch(self, asset: str, **kwargs):
        # Map logical name to physical table
        mapping = {
            "Wells": "WELL",
            "Well Logs": "WELL_LOG",
            "Seismic 2D": "SEISMIC_LINE",
            "Checkshots": "CHECKSHOT",
        }
        physical_table = mapping.get(asset, asset)
        return super().read_batch(physical_table, **kwargs)
