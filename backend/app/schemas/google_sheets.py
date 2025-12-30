from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class GoogleSheetsPreviewRequest(BaseModel):
    spreadsheet_id: str
    auth_type: str = "service_account"
    service_account_json: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None

class GoogleSheetsPreviewResponse(BaseModel):
    title: str
    sheets: List[str]
    owner: Optional[str] = None
