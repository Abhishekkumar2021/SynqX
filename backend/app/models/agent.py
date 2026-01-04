from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import (
    Integer, String, DateTime, ForeignKey, JSON, Enum as SQLEnum, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.models.base import Base, AuditMixin, SoftDeleteMixin
from app.models.enums import AgentStatus

if TYPE_CHECKING:
    from app.models.workspace import Workspace

class Agent(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    # Identification
    client_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True) 
    secret_key_hash: Mapped[str] = mapped_column(String(255), nullable=False) # Hashed API Key
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Workspace scoping
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # State
    status: Mapped[AgentStatus] = mapped_column(
        SQLEnum(AgentStatus), default=AgentStatus.OFFLINE, nullable=False
    )
    last_heartbeat_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45)) # IPv6
    version: Mapped[Optional[str]] = mapped_column(String(50)) # Agent version
    
    # Routing
    tags: Mapped[Optional[dict]] = mapped_column(JSON, default=dict) # e.g. {"cloud": "aws", "region": "us-east-1"}
    
    # System Info (optional telemetry)
    system_info: Mapped[Optional[dict]] = mapped_column(JSON, default=dict) # OS, CPU, RAM
    
    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace")

    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_agent_workspace_name"),
    )

    def __repr__(self):
        return f"<Agent(id={self.id}, name='{self.name}', status={self.status})>"