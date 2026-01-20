from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from synqx_core.models.enums import AgentStatus
from synqx_core.schemas.common import AuditSchema, TimestampSchema


class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    tags: dict[str, Any] = Field(default_factory=dict)
    system_info: dict[str, Any] = Field(default_factory=dict)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: dict[str, Any]) -> dict[str, Any]:
        if "groups" in v and isinstance(v["groups"], list):
            if any(g.lower() == "internal" for g in v["groups"]):
                raise ValueError(
                    "'internal' is a reserved group name and cannot be used."
                )
        return v


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    tags: dict[str, str] | None = None
    status: AgentStatus | None = None


class AgentHeartbeat(BaseModel):
    status: AgentStatus = AgentStatus.ONLINE
    system_info: dict[str, str] | None = None
    ip_address: str | None = None
    version: str | None = None


class AgentResponse(AgentBase, AuditSchema, TimestampSchema):
    id: int
    client_id: str
    workspace_id: int
    status: AgentStatus
    last_heartbeat_at: datetime | None
    ip_address: str | None
    version: str | None

    class Config:
        from_attributes = True


class AgentToken(BaseModel):
    client_id: str
    api_key: str  # Secret key shown once


class AgentJobStatusUpdate(BaseModel):
    status: str  # "running", "success", "failed"
    message: str | None = None
    execution_time_ms: int | None = None
    # Metrics
    total_records: int | None = 0
    total_bytes: int | None = 0


class AgentStepUpdate(BaseModel):
    node_id: str
    status: str  # "pending", "running", "success", "failed"

    # Metrics
    records_in: int = 0
    records_out: int = 0
    records_filtered: int = 0
    records_error: int = 0
    bytes_processed: int = 0

    # Resources
    cpu_percent: float | None = None
    memory_mb: float | None = None

    # Diagnostics
    error_message: str | None = None
    sample_data: dict[str, Any] | None = None  # For forensics
    quality_profile: dict[str, Any] | None = None


class AgentJobLogEntry(BaseModel):
    level: str  # INFO, ERROR, etc.
    message: str
    timestamp: datetime | None = None
    node_id: str | None = None  # associated node
