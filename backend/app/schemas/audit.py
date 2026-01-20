from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    event_type: str
    target_type: str | None = None
    target_id: int | None = None
    details: dict[str, Any] | None = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: list[AuditLogRead]
    total: int
    limit: int
    offset: int
