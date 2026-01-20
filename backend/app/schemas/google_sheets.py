from typing import Any

from pydantic import BaseModel


class GoogleSheetsPreviewRequest(BaseModel):
    spreadsheet_id: str
    auth_type: str = "service_account"
    service_account_json: dict[str, Any] | None = None
    api_key: str | None = None


class GoogleSheetsPreviewResponse(BaseModel):
    title: str
    sheets: list[str]
    owner: str | None = None
