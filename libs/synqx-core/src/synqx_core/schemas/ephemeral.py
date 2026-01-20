from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from synqx_core.models.enums import JobStatus, JobType
from synqx_core.schemas.common import TimestampSchema


class EphemeralJobBase(BaseModel):
    job_type: JobType
    connection_id: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    agent_group: str | None = None


class EphemeralJobCreate(EphemeralJobBase):
    pass


class EphemeralJobUpdate(BaseModel):
    status: JobStatus | None = None
    result_summary: dict[str, Any] | None = None
    result_sample: dict[str, Any] | None = None
    result_sample_arrow: str | None = None  # Base64 encoded Arrow IPC data
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    execution_time_ms: int | None = None
    worker_id: str | None = None


class EphemeralJobResponse(EphemeralJobBase, TimestampSchema):
    id: int
    workspace_id: int
    user_id: int | None
    status: JobStatus
    worker_id: str | None
    result_summary: dict[str, Any] | None
    result_sample: dict[str, Any] | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    execution_time_ms: int | None

    class Config:
        from_attributes = True
