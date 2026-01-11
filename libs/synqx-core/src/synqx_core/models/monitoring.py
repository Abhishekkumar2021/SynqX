from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Text, ForeignKey, 
    Index, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from synqx_core.models.base import Base, AuditMixin, SoftDeleteMixin, OwnerMixin
from synqx_core.models.enums import (
    AlertType, AlertDeliveryMethod, AlertLevel, AlertStatus
)

if TYPE_CHECKING:
    from synqx_core.models.pipelines import Pipeline
    from synqx_core.models.execution import Job

class SchedulerEvent(Base, AuditMixin):
    """Track scheduler activities and triggers"""
    __tablename__ = "scheduler_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_id: Mapped[int] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )

    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    cron_expression: Mapped[Optional[str]] = mapped_column(String(100))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True,
    )

    reason: Mapped[Optional[str]] = mapped_column(Text)
    scheduler_metadata: Mapped[Optional[dict]] = mapped_column(JSON)

    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="scheduler_events")

    __table_args__ = (
        Index("idx_scheduler_event_type_time", "event_type", "timestamp"),
        Index("idx_scheduler_pipeline_time", "pipeline_id", "timestamp"),
    )

    def __repr__(self):
        return f"<SchedulerEvent(pipeline_id={self.pipeline_id}, type='{self.event_type}')>"


class JobLog(Base, AuditMixin):
    """Job-level execution logs"""
    __tablename__ = "job_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_payload: Mapped[Optional[dict]] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True,
    )
    source: Mapped[Optional[str]] = mapped_column(String(255))

    # Relationship defined in Job using string to avoid circular dependency
    # job relationship is implicit via backref or can be added if needed explicitly

    __table_args__ = (Index("idx_job_log_level_time", "job_id", "level", "timestamp"),)

    def __repr__(self):
        return f"<JobLog(job_id={self.job_id}, level='{self.level}')>"


class StepLog(Base, AuditMixin):
    """Step-level execution logs"""
    __tablename__ = "step_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    step_run_id: Mapped[int] = mapped_column(
        ForeignKey("step_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_payload: Mapped[Optional[dict]] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True,
    )
    source: Mapped[Optional[str]] = mapped_column(String(255))

    __table_args__ = (Index("idx_step_log_level_time", "step_run_id", "level", "timestamp"),)

    def __repr__(self):
        return f"<StepLog(step_run_id={self.step_run_id}, level='{self.level}')>"


class AlertConfig(Base, AuditMixin, SoftDeleteMixin, OwnerMixin):
    """Alert configuration and rules"""
    __tablename__ = "alert_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)

    alert_type: Mapped[AlertType] = mapped_column(SQLEnum(AlertType), nullable=False)
    delivery_method: Mapped[AlertDeliveryMethod] = mapped_column(SQLEnum(AlertDeliveryMethod), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)

    threshold_value: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    threshold_window_minutes: Mapped[Optional[int]] = mapped_column(Integer)

    pipeline_filter: Mapped[Optional[list]] = mapped_column(JSON)
    severity_filter: Mapped[Optional[list]] = mapped_column(JSON)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Workspace scoping
    workspace_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="config")

    __table_args__ = (
        Index("idx_alert_config_enabled", "enabled", "alert_type"),
    )

    def __repr__(self):
        return f"<AlertConfig(id={self.id}, name='{self.name}', type={self.alert_type})>"


class Alert(Base, AuditMixin, OwnerMixin):
    """Individual alert instances"""
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)

    alert_config_id: Mapped[Optional[int]] = mapped_column(ForeignKey("alert_configs.id", ondelete="SET NULL"), index=True)
    pipeline_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pipelines.id", ondelete="SET NULL"), index=True)
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey("jobs.id", ondelete="SET NULL"), index=True)

    message: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[AlertLevel] = mapped_column(SQLEnum(AlertLevel), default=AlertLevel.INFO, nullable=False, index=True)

    status: Mapped[AlertStatus] = mapped_column(SQLEnum(AlertStatus), default=AlertStatus.PENDING, nullable=False, index=True)
    delivery_method: Mapped[AlertDeliveryMethod] = mapped_column(SQLEnum(AlertDeliveryMethod), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)

    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(255))

    delivery_error: Mapped[Optional[str]] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Workspace scoping
    workspace_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    config: Mapped[Optional["AlertConfig"]] = relationship("AlertConfig", back_populates="alerts")
    pipeline: Mapped[Optional["Pipeline"]] = relationship("Pipeline")
    job: Mapped[Optional["Job"]] = relationship("Job")

    __table_args__ = (
        Index("idx_alert_status_created", "status", "created_at"),
        Index("idx_alert_level_status", "level", "status"),
        Index("idx_alert_pipeline_created", "pipeline_id", "created_at"),
    )

    def __repr__(self):
        return f"<Alert(id={self.id}, level={self.level}, status={self.status})>"