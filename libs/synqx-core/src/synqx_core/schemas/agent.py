from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from synqx_core.schemas.common import AuditSchema, TimestampSchema
from synqx_core.models.enums import AgentStatus

class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    tags: Dict[str, Any] = Field(default_factory=dict)
    system_info: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if "groups" in v and isinstance(v["groups"], list):
            if any(g.lower() == "internal" for g in v["groups"]):
                raise ValueError("'internal' is a reserved group name and cannot be used.")
        return v

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    tags: Optional[Dict[str, str]] = None
    status: Optional[AgentStatus] = None

class AgentHeartbeat(BaseModel):
    status: AgentStatus = AgentStatus.ONLINE
    system_info: Optional[Dict[str, str]] = None
    ip_address: Optional[str] = None
    version: Optional[str] = None

class AgentResponse(AgentBase, AuditSchema, TimestampSchema):
    id: int
    client_id: str
    workspace_id: int
    status: AgentStatus
    last_heartbeat_at: Optional[datetime]
    ip_address: Optional[str]
    version: Optional[str]

    class Config:
        from_attributes = True

class AgentToken(BaseModel):
    client_id: str
    api_key: str  # Secret key shown once

class AgentJobStatusUpdate(BaseModel):
    status: str # "running", "success", "failed"
    message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    # Metrics
    total_records: Optional[int] = 0
    total_bytes: Optional[int] = 0

class AgentStepUpdate(BaseModel):
    node_id: str
    status: str # "pending", "running", "success", "failed"
    
    # Metrics
    records_in: int = 0
    records_out: int = 0
    records_filtered: int = 0
    records_error: int = 0
    bytes_processed: int = 0
    
    # Resources
    cpu_percent: Optional[float] = None
    memory_mb: Optional[float] = None
    
    # Diagnostics
    error_message: Optional[str] = None
    sample_data: Optional[Dict[str, Any]] = None # For forensics

class AgentJobLogEntry(BaseModel):
    level: str # INFO, ERROR, etc.
    message: str
    timestamp: Optional[datetime] = None
    node_id: Optional[str] = None # associated node