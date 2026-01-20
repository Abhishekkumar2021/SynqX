from typing import Any

import pandas as pd

from .base import OSDUBaseClient


class OSDUWellboreService(OSDUBaseClient):
    """
    Wellbore DDMS (WDMS) implementation.
    """

    def get_wells(self, limit: int = 100) -> list[dict[str, Any]]:
        payload = {"kind": "*:*:master-data--Well:*", "query": "*", "limit": limit}
        return self._post("api/search/v2/query", json=payload).json().get("results", [])

    def get_wellbores(self, well_id: str) -> list[dict[str, Any]]:
        payload = {
            "kind": "*:*:master-data--Wellbore:*",
            "query": f'data.WellID: "{well_id}"',
        }
        return self._post("api/search/v2/query", json=payload).json().get("results", [])

    def get_welllogs(self, wellbore_id: str) -> list[dict[str, Any]]:
        payload = {
            "kind": "*:*:work-product-component--WellLog:*",
            "query": f'data.WellboreID: "{wellbore_id}"',
        }
        return self._post("api/search/v2/query", json=payload).json().get("results", [])

    def get_log_data(self, welllog_id: str) -> pd.DataFrame:
        """
        Retrieves curve data for a WellLog from WDMS.
        """
        headers = self.headers.copy()
        headers["Accept"] = "application/json"

        # OSDU standard path for WDMS
        path = f"api/os-wellbore-ddms/ddms/v3/welllogs/{welllog_id}/data"
        resp = self._get(path)
        data = resp.json()

        if "columns" in data and "data" in data:
            return pd.DataFrame(data["data"], columns=data["columns"])
        return pd.DataFrame()
