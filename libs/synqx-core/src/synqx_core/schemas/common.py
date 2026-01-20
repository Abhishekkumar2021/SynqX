from datetime import datetime

from pydantic import BaseModel


class TimestampSchema(BaseModel):
    created_at: datetime
    updated_at: datetime


class UserTrackingSchema(BaseModel):
    created_by: str | None = None
    updated_by: str | None = None


class AuditSchema(UserTrackingSchema):
    workspace_id: int | None = None
