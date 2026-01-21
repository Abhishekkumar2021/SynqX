from typing import Any

import pandas as pd
from synqx_core.logging import get_logger

from .base import OSDUBaseClient

logger = get_logger(__name__)


class OSDUWellboreService(OSDUBaseClient):
    """
    Wellbore DDMS (WDMS) implementation.
    """

    def get_wells(self, limit: int = 100) -> list[dict[str, Any]]:
        resp = self.search(kind="*:*:master-data--Well:*", query="*", limit=limit)
        return resp.get("results", [])

    def get_wellbores(self, well_id: str) -> list[dict[str, Any]]:
        resp = self.search(
            kind="*:*:master-data--Wellbore:*",
            query=f'data.WellID: "{well_id}"'
        )
        return resp.get("results", [])

    def get_welllogs(self, wellbore_id: str) -> list[dict[str, Any]]:
        resp = self.search(
            kind="*:*:work-product-component--WellLog:*",
            query=f'data.WellboreID: "{wellbore_id}"'
        )
        return resp.get("results", [])

    def get_well_domain_overview(self, limit: int = 100, offset: int = 0) -> dict[str, Any]:
        """
        Aggregates a comprehensive view of the Well Delivery Domain.
        Returns Fields, Wells, Wellbores, Logs, and Trajectories with total counts.
        """
        # 0. Fields (Master Data)
        fields_resp = self.search(
            kind="*:*:master-data--Field:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.FieldName", "createTime"]
        )

        # 1. Wells (Master Data)
        wells_resp = self.search(
            kind="*:*:master-data--Well:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.FacilityName", "data.CurrentOperatorID", "createTime"]
        )

        # 2. Wellbores (Master Data)
        wellbores_resp = self.search(
            kind="*:*:master-data--Wellbore:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.FacilityName", "data.WellID", "createTime"]
        )

        # 3. Well Logs (WPC)
        logs_resp = self.search(
            kind="*:*:work-product-component--WellLog:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.Name", "data.WellboreID", "data.Curves", "createTime"]
        )

        # 4. Trajectories (WPC)
        trajectories_resp = self.search(
            kind="*:*:work-product-component--WellboreTrajectory:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.Name", "data.WellboreID", "createTime"]
        )

        return {
            "fields": fields_resp.get("results", []),
            "fields_total": fields_resp.get("totalCount", 0),
            "wells": wells_resp.get("results", []),
            "wells_total": wells_resp.get("totalCount", 0),
            "wellbores": wellbores_resp.get("results", []),
            "wellbores_total": wellbores_resp.get("totalCount", 0),
            "logs": logs_resp.get("results", []),
            "logs_total": logs_resp.get("totalCount", 0),
            "trajectories": trajectories_resp.get("results", []),
            "trajectories_total": trajectories_resp.get("totalCount", 0)
        }

    def get_log_data(self, welllog_id: str) -> list[dict[str, Any]]:
        """
        Retrieves curve data for a WellLog from WDMS.
        """
        # Ensure ID is unversioned for WDMS
        # Simple regex-less versioning strip: OSDU IDs are partition:kind:id[:version]
        parts = welllog_id.split(":")
        clean_id = ":".join(parts[:3]) if len(parts) > 3 else welllog_id

        path = f"api/os-wellbore-ddms/ddms/v3/welllogs/{clean_id}/data"
        try:
            resp = self._get(path)
            data = resp.json()

            if "columns" in data and "data" in data:
                df = pd.DataFrame(data["data"], columns=data["columns"])
                return df.to_dict(orient="records")
        except Exception as e:
            # Fallback for some environments that might expect version or encoded differently
            logger.warning(f"WDMS Log Fetch failed for {clean_id}: {e}")
            pass
        return []

    def get_trajectory_data(self, trajectory_id: str) -> list[dict[str, Any]]:
        """
        Retrieves station data for a WellboreTrajectory from WDMS.
        """
        parts = trajectory_id.split(":")
        clean_id = ":".join(parts[:3]) if len(parts) > 3 else trajectory_id

        path = f"api/os-wellbore-ddms/ddms/v3/wellboretrajectories/{clean_id}/data"
        try:
            resp = self._get(path)
            data = resp.json()
            if "columns" in data and "data" in data:
                df = pd.DataFrame(data["data"], columns=data["columns"])
                return df.to_dict(orient="records")
        except Exception as e:
            logger.warning(f"WDMS Trajectory Fetch failed for {clean_id}: {e}")
            pass
        return []
