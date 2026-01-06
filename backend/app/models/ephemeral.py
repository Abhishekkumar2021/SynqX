from typing import Optional, Any, Dict
from datetime import datetime
from sqlalchemy import (
    Integer, String, DateTime, ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.models.base import Base, AuditMixin
from app.models.enums import JobStatus, JobType

class EphemeralJob(Base, AuditMixin):
    """
    Dedicated model for non-pipeline, short-lived execution tasks.
    Used for Explorer queries, Schema inference, and Connection testing.
    """
    __tablename__ = "ephemeral_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    # Context
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    connection_id: Mapped[Optional[int]] = mapped_column(ForeignKey("connections.id", ondelete="SET NULL"), nullable=True)
    
    # Categorization
    job_type: Mapped[JobType] = mapped_column(SQLEnum(JobType), default=JobType.EXPLORER, index=True)
    status: Mapped[JobStatus] = mapped_column(SQLEnum(JobStatus), default=JobStatus.PENDING, index=True)
    
    # Task Payload (e.g., {"query": "SELECT *", "limit": 100})
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    # Execution Metadata
    agent_group: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    worker_id: Mapped[Optional[str]] = mapped_column(String(255)) # client_id of picking agent
    
    # Results & Feedback
    result_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON) # e.g. {"row_count": 100, "columns": [...]}
    result_sample: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON) # The actual data rows
    error_message: Mapped[Optional[str]] = mapped_column(String)
    
    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    execution_time_ms: Mapped[Optional[int]] = mapped_column(Integer)

    # Relationships
    workspace = relationship("Workspace")
    user = relationship("User")
    connection = relationship("Connection")

    def __repr__(self):
        return f"<EphemeralJob(id={self.id}, type={self.job_type}, status={self.status})>"
