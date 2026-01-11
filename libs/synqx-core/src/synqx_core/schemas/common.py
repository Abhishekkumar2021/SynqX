from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class TimestampSchema(BaseModel):
    created_at: datetime
    updated_at: datetime

class UserTrackingSchema(BaseModel):
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class AuditSchema(UserTrackingSchema):
    workspace_id: Optional[int] = None
