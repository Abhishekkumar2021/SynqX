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

    def create_group(self, name: str, description: str):
        payload = {"name": name, "description": description}
        return self._post("api/entitlements/v2/groups", json=payload).json()

    def delete_group(self, group_email: str):
        self._delete(f"api/entitlements/v2/groups/{group_email}")

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

    def create_legal_tag(self, name: str, description: str, country_of_origin: list[str], **kwargs):
        payload = {
            "name": name,
            "description": description,
            "properties": {
                "countryOfOrigin": country_of_origin,
                "contractId": kwargs.get("contract_id", "Unknown"),
                "expirationDate": kwargs.get("expiration_date", "2099-12-31"),
                "originator": kwargs.get("originator", "Synqx"),
                "dataType": kwargs.get("data_type", "Public Domain Data"),
                "securityClassification": kwargs.get("security_classification", "Public"),
                "personalData": kwargs.get("personal_data", "No Personal Data"),
                "exportClassification": kwargs.get("export_classification", "Not Technical Data")
            }
        }
        return self._post("api/legal/v1/legaltags", json=payload).json()

    def delete_legal_tag(self, name: str):
        self._delete(f"api/legal/v1/legaltags/{name}")
