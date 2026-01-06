from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import JobStatus, JobType
from app.schemas.common import TimestampSchema

class EphemeralJobBase(BaseModel):
    job_type: JobType
    connection_id: Optional[int] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    agent_group: Optional[str] = None

class EphemeralJobCreate(EphemeralJobBase):
    pass

class EphemeralJobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    result_summary: Optional[Dict[str, Any]] = None
    result_sample: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    execution_time_ms: Optional[int] = None
    worker_id: Optional[str] = None

class EphemeralJobResponse(EphemeralJobBase, TimestampSchema):
    id: int
    workspace_id: int
    user_id: Optional[int]
    status: JobStatus
    worker_id: Optional[str]
    result_summary: Optional[Dict[str, Any]]
    result_sample: Optional[Dict[str, Any]]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    execution_time_ms: Optional[int]

    class Config:
        from_attributes = True
