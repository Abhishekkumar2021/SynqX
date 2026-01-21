from typing import Any

from .base import OSDUBaseClient


class OSDUSeismicService(OSDUBaseClient):
    """
    Seismic DDMS (SDMS) implementation.
    Handles discovery and metadata retrieval for seismic assets.
    """

    def get_seismic_projects(self, limit: int = 100) -> list[dict[str, Any]]:
        """Discover Seismic Projects (Acquisition, Interpretation, Processing)."""
        # We delegate to self.search for unified cleaning and tracking
        resp = self.search(
            kind="*:*:master-data--Seismic*Project:*",
            query="*",
            limit=limit,
            returnedFields=["id", "kind", "data", "createTime", "modifyTime"]
        )
        return resp.get("results", [])

    def get_seismic_domain_overview(self, limit: int = 100, offset: int = 0) -> dict[str, Any]:
        """
        Aggregates a comprehensive view of the Seismic Domain.
        Returns Projects, Trace Data, Bin Grids, and Interpretations with total counts.
        """
        # 1. Projects (Master Data - Acquisition, Processing, etc.)
        projects_resp = self.search(
            kind="*:*:master-data--Seismic*Project:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.ProjectName", "data.ProjectID", "createTime"]
        )

        # 2. Trace Data (WPC - The actual seismic volumes)
        traces_resp = self.search(
            kind="*:*:work-product-component--SeismicTraceData:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.Name", "data.TotalSize", "data.LiveTraceOutline", "createTime"]
        )

        # 3. Bin Grids (WPC - Geometry definitions)
        bingrids_resp = self.search(
            kind="*:*:work-product-component--SeismicBinGrid:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.Name", "data.BinGridName", "data.P6BinGridOriginI", "createTime"]
        )

        # 4. Interpretations (Master & WPC - Horizons, Faults, Sets)
        # We query for Interpretation Sets (Master)
        interp_sets_resp = self.search(
            kind="*:*:master-data--Seismic*InterpretationSet:*",
            query="*",
            limit=limit,
            offset=offset,
            returnedFields=["id", "kind", "data.Name", "createTime"]
        )

        return {
            "projects": projects_resp.get("results", []),
            "projects_total": projects_resp.get("totalCount", 0),
            "traces": traces_resp.get("results", []),
            "traces_total": traces_resp.get("totalCount", 0),
            "bingrids": bingrids_resp.get("results", []),
            "bingrids_total": bingrids_resp.get("totalCount", 0),
            "interpretations": interp_sets_resp.get("results", []),
            "interpretations_total": interp_sets_resp.get("totalCount", 0)
        }

    def get_seismic_trace_data(self, project_id: str) -> list[dict[str, Any]]:
        """Get Trace Data records associated with a project."""
        resp = self.search(
            kind="*:*:work-product-component--SeismicTraceData:*",
            query=f'data.PrincipalAcquisitionProjectID: "{project_id}"'
        )
        return resp.get("results", [])

    def get_seismic_interpretation_projects(self) -> list[dict[str, Any]]:
        """Get Seismic Interpretation Projects."""
        resp = self.search(
            kind="*:*:master-data--SeismicInterpretationProject:*",
            query="*"
        )
        return resp.get("results", [])

    def get_trace_metadata(self, trace_data_id: str) -> dict[str, Any]:
        """
        Fetches detailed metadata for a specific seismic trace data record 
        directly from the Seismic DDMS.
        """
        # OSDU standard path for Seismic DDMS
        path = f"api/seismic-ddms/v3/seismictrace/{trace_data_id}"
        try:
            return self._get(path).json()
        except Exception:
            # Fallback if SDMS is not following v3 path precisely in this environment
            return {}
