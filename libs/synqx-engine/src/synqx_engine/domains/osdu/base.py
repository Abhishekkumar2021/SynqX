from typing import Any

import requests
from synqx_core.errors import ConnectionFailedError
from synqx_core.logging import get_logger

logger = get_logger(__name__)


class OSDUBaseClient:
    """
    Base client for OSDU services handling authentication,
    partitioning, and common request patterns.
    """

    def __init__(self, base_url: str, data_partition_id: str, auth_token: str):
        self.base_url = base_url.rstrip("/")
        self.data_partition_id = data_partition_id
        self.auth_token = auth_token
        self.headers = {
            "data-partition-id": data_partition_id,
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        }

    def _get(
        self, path: str, params: dict[str, Any] | None = None, timeout: int = 30
    ) -> requests.Response:
        url = f"{self.base_url}/{path.lstrip('/')}"
        resp = requests.get(url, headers=self.headers, params=params, timeout=timeout)
        self._handle_errors(resp)
        return resp

    def _post(
        self, path: str, json: dict[str, Any] | None = None, timeout: int = 30
    ) -> requests.Response:
        url = f"{self.base_url}/{path.lstrip('/')}"
        resp = requests.post(url, headers=self.headers, json=json, timeout=timeout)
        self._handle_errors(resp)
        return resp

    def _put(
        self, path: str, json: dict[str, Any] | None = None, timeout: int = 30
    ) -> requests.Response:
        url = f"{self.base_url}/{path.lstrip('/')}"
        resp = requests.put(url, headers=self.headers, json=json, timeout=timeout)
        self._handle_errors(resp)
        return resp

    def _delete(self, path: str, timeout: int = 30) -> requests.Response:
        url = f"{self.base_url}/{path.lstrip('/')}"
        resp = requests.delete(url, headers=self.headers, timeout=timeout)
        self._handle_errors(resp)
        return resp

    def _handle_errors(self, resp: requests.Response):
        if resp.status_code == 401:  # noqa: PLR2004
            raise ConnectionFailedError("OSDU Session Expired or Token Invalid (401)")
        if resp.status_code == 403:  # noqa: PLR2004
            raise ConnectionFailedError(
                f"Access Denied to OSDU Partition '{self.data_partition_id}' (403)"
            )
        resp.raise_for_status()

    def search(
        self,
        kind: str = "*:*:*:*",
        query: str = "*",
        limit: int = 100,
        offset: int = 0,
        **kwargs,
    ) -> dict[str, Any]:
        """
        Generic search method available to all OSDU domain services.
        Handles limit/offset boundaries and internal kwarg cleaning.
        """
        # Strip internal Synqx metadata that OSDU parser rejects
        clean_kwargs = {
            k: v
            for k, v in kwargs.items()
            if k
            in [
                "aggregateBy",
                "spatialFilter",
                "returnedFields",
                "sort",
                "trackTotalCount",
            ]
        }

        # OSDU Limit/Offset Boundaries
        safe_limit = min(limit, 1000)
        safe_offset = max(offset, 0)

        payload = {
            "kind": kind or "*:*:*:*",
            "query": query or "*",
            "limit": safe_limit,
            "offset": safe_offset,
            "trackTotalCount": True,
            **clean_kwargs,
        }
        return self._post("api/search/v2/query", json=payload).json()
