from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from synqx_core.models.base import AuditMixin, Base, SoftDeleteMixin
from synqx_core.models.enums import AgentStatus

if TYPE_CHECKING:
    from synqx_core.models.workspace import Workspace


class Agent(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identification
    client_id: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    secret_key_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # Hashed API Key
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Workspace scoping
    workspace_id: Mapped[int] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # State
    status: Mapped[AgentStatus] = mapped_column(
        SQLEnum(AgentStatus), default=AgentStatus.OFFLINE, nullable=False
    )
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    ip_address: Mapped[str | None] = mapped_column(String(45))  # IPv6
    version: Mapped[str | None] = mapped_column(String(50))  # Agent version

    # Routing
    tags: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # e.g. {"cloud": "aws", "region": "us-east-1"}

    # System Info (optional telemetry)
    system_info: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # OS, CPU, RAM

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace")

    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_agent_workspace_name"),
    )

    def __repr__(self):
        return f"<Agent(id={self.id}, name='{self.name}', status={self.status})>"
