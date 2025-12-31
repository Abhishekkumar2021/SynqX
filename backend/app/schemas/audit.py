from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class AuditLogRead(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    event_type: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuditLogListResponse(BaseModel):
    items: List[AuditLogRead]
    total: int
    limit: int
    offset: int
