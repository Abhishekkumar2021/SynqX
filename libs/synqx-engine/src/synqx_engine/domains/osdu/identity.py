from typing import Any

from .base import OSDUBaseClient


class OSDUGovernanceService(OSDUBaseClient):
    """
    Entitlements and Legal services implementation.
    """

    # --- Entitlements (Identity) ---
    def get_groups(
        self, limit: int = 100, offset: int = 0, **kwargs
    ) -> list[dict[str, Any]]:
        params = {"limit": limit, "offset": offset, **kwargs}
        return (
            self._get("api/entitlements/v2/groups", params=params)
            .json()
            .get("groups", [])
        )

    def get_group_members(self, group_email: str) -> list[dict[str, Any]]:
        return (
            self._get(f"api/entitlements/v2/groups/{group_email}/members")
            .json()
            .get("members", [])
        )

    def add_member(self, group_email: str, email: str, role: str = "MEMBER"):
        payload = {"email": email, "role": role}
        return self._post(
            f"api/entitlements/v2/groups/{group_email}/members", json=payload
        ).json()

    # --- Legal (Compliance) ---
    def get_legal_tags(
        self, limit: int = 100, offset: int = 0, **kwargs
    ) -> list[dict[str, Any]]:
        params = {"limit": limit, "offset": offset, **kwargs}
        return (
            self._get("api/legal/v1/legaltags", params=params)
            .json()
            .get("legalTags", [])
        )

    def get_legal_tag(self, name: str) -> dict[str, Any]:
        return self._get(f"api/legal/v1/legaltags/{name}").json()

    def delete_legal_tag(self, name: str):
        self._delete(f"api/legal/v1/legaltags/{name}")
