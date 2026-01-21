from typing import Any

from .base import OSDUBaseClient


class OSDUPolicyService(OSDUBaseClient):
    """
    Policy Service (OPA) implementation.
    """

    def list_policies(self) -> list[str]:
        """GET api/policy/v1/policies"""
        try:
            return self._get("api/policy/v1/policies").json().get("policies", [])
        except Exception:
            return []

    def get_policy(self, policy_id: str) -> str:
        """GET api/policy/v1/policies/{policy_id}"""
        return self._get(f"api/policy/v1/policies/{policy_id}").text

    def evaluate_policy(self, policy_id: str, input_data: dict[str, Any]) -> dict[str, Any]:
        """POST api/policy/v1/policies/{policy_id}/eval"""
        return self._post(f"api/policy/v1/policies/{policy_id}/eval", json=input_data).json()
