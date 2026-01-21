from typing import Any

from .base import OSDUBaseClient


class OSDUWorkflowService(OSDUBaseClient):
    """
    Workflow Service implementation.
    Enables triggering and monitoring OSDU Ingestion Workflows.
    """

    def list_workflows(self) -> list[dict[str, Any]]:
        """GET api/workflow/v1/workflow"""
        return self._get("api/workflow/v1/workflow").json()

    def get_workflow(self, workflow_name: str) -> dict[str, Any]:
        """GET api/workflow/v1/workflow/{workflow_name}"""
        return self._get(f"api/workflow/v1/workflow/{workflow_name}").json()

    def trigger_workflow(self, workflow_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST api/workflow/v1/workflow/{workflow_name}/workflowRun"""
        return self._post(f"api/workflow/v1/workflow/{workflow_name}/workflowRun", json=payload).json()

    def get_workflow_run(self, workflow_name: str, run_id: str) -> dict[str, Any]:
        """GET api/workflow/v1/workflow/{workflow_name}/run/{run_id}"""
        return self._get(f"api/workflow/v1/workflow/{workflow_name}/run/{run_id}").json()

    def list_workflow_runs(self, workflow_name: str) -> list[dict[str, Any]]:
        """GET api/workflow/v1/workflow/{workflow_name}/run"""
        return self._get(f"api/workflow/v1/workflow/{workflow_name}/run").json()

    def get_workflow_run_logs(self, workflow_name: str, run_id: str) -> str:
        """
        Retrieves logs for a specific workflow run.
        Note: OSDU standard might require fetching per-task, but we provide a 
        convenience method for the main execution log.
        """
        # Attempt to get log via standard workflow service path
        path = f"api/workflow/v1/workflow/{workflow_name}/run/{run_id}/log"
        try:
            return self._get(path).text
        except Exception:
            return "No logs available for this run."
