from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger

logger = get_logger(__name__)


class OIDCService:
    @staticmethod
    async def get_oidc_config() -> dict[str, Any]:
        """Fetch OIDC configuration from the discovery URL."""
        if not settings.OIDC_DISCOVERY_URL:
            raise AppError("OIDC_DISCOVERY_URL is not configured")

        async with httpx.AsyncClient() as client:
            response = await client.get(settings.OIDC_DISCOVERY_URL)
            if response.status_code != 200:  # noqa: PLR2004
                logger.error(f"Failed to fetch OIDC config: {response.text}")
                raise AppError("Failed to fetch OIDC configuration")
            return response.json()

    @staticmethod
    async def get_token_from_code(code: str) -> dict[str, Any]:
        """Exchange authorization code for access/ID tokens."""
        config = await OIDCService.get_oidc_config()
        token_endpoint = config.get("token_endpoint")

        if not token_endpoint:
            raise AppError("OIDC token endpoint not found in configuration")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.OIDC_REDIRECT_URI,
            "client_id": settings.OIDC_CLIENT_ID,
            "client_secret": settings.OIDC_CLIENT_SECRET,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_endpoint, data=data)
            if response.status_code != 200:  # noqa: PLR2004
                logger.error(f"OIDC token exchange failed: {response.text}")
                raise AppError(
                    f"Failed to exchange OIDC code: {response.json().get('error_description', 'Unknown error')}"  # noqa: E501
                )
            return response.json()

    @staticmethod
    async def get_user_info(access_token: str) -> dict[str, Any]:
        """Fetch user information using the access token."""
        config = await OIDCService.get_oidc_config()
        userinfo_endpoint = config.get("userinfo_endpoint")

        if not userinfo_endpoint:
            raise AppError("OIDC userinfo endpoint not found in configuration")

        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(userinfo_endpoint, headers=headers)
            if response.status_code != 200:  # noqa: PLR2004
                logger.error(f"Failed to fetch OIDC userinfo: {response.text}")
                raise AppError("Failed to fetch OIDC user information")
            return response.json()
