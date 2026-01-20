from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from synqx_core.models.base import AuditMixin, Base, OwnerMixin
from synqx_core.models.enums import (
    JobStatus,
    OperatorRunStatus,
    OperatorType,
    PipelineRunStatus,
    RetryStrategy,
)

if TYPE_CHECKING:
    from synqx_core.models.connections import Asset
    from synqx_core.models.monitoring import JobLog, StepLog
    from synqx_core.models.pipelines import Pipeline, PipelineNode, PipelineVersion


class Job(Base, AuditMixin, OwnerMixin):
    """Job execution wrapper for Celery tasks"""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_id: Mapped[int] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pipeline_version_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_versions.id"), nullable=False
    )

    celery_task_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True
    )
    correlation_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    retry_strategy: Mapped[RetryStrategy] = mapped_column(
        SQLEnum(RetryStrategy), default=RetryStrategy.FIXED, nullable=False
    )
    retry_delay_seconds: Mapped[int] = mapped_column(
        Integer, default=60, nullable=False
    )

    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus), default=JobStatus.PENDING, nullable=False, index=True
    )
    infra_error: Mapped[str | None] = mapped_column(Text)

    # Enterprise Ops
    is_backfill: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    backfill_config: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # e.g. {"start_date": "...", "end_date": "..."}

    worker_id: Mapped[str | None] = mapped_column(String(255))
    queue_name: Mapped[str | None] = mapped_column(String(255))
    execution_time_ms: Mapped[int | None] = mapped_column(BigInteger)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Workspace scoping
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    pipeline: Mapped[Pipeline] = relationship("Pipeline", back_populates="jobs")
    version: Mapped[PipelineVersion] = relationship("PipelineVersion")
    run: Mapped[PipelineRun | None] = relationship(
        "PipelineRun", back_populates="job", uselist=False, cascade="all, delete-orphan"
    )

    # Ensure this relationship string matches the class name in monitoring.py
    logs: Mapped[list[JobLog]] = relationship(
        "JobLog", cascade="all, delete-orphan", order_by="JobLog.timestamp"
    )

    __table_args__ = (
        Index("idx_job_status_created", "status", "created_at"),
        Index("idx_job_pipeline_status", "pipeline_id", "status"),
        Index("idx_job_correlation", "correlation_id"),
    )

    def __repr__(self):
        return (
            f"<Job(id={self.id}, status={self.status}, pipeline_id={self.pipeline_id})>"
        )


class PipelineRun(Base, AuditMixin, OwnerMixin):
    """Single logical execution of a pipeline"""

    __tablename__ = "pipeline_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    pipeline_id: Mapped[int] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pipeline_version_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_versions.id"), nullable=False
    )

    run_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PipelineRunStatus] = mapped_column(
        SQLEnum(PipelineRunStatus),
        default=PipelineRunStatus.PENDING,
        nullable=False,
        index=True,
    )
    total_nodes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    total_extracted: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_loaded: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    total_failed: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    bytes_processed: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Workspace scoping
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(Text)
    failed_step_id: Mapped[int | None] = mapped_column(Integer)

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[float | None] = mapped_column(Float)

    job: Mapped[Job] = relationship("Job", back_populates="run")
    pipeline: Mapped[Pipeline] = relationship("Pipeline", back_populates="runs")
    version: Mapped[PipelineVersion] = relationship("PipelineVersion")

    step_runs: Mapped[list[StepRun]] = relationship(
        "StepRun",
        back_populates="pipeline_run",
        cascade="all, delete-orphan",
        order_by="StepRun.order_index",
    )
    context: Mapped[PipelineRunContext | None] = relationship(
        "PipelineRunContext",
        back_populates="pipeline_run",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("pipeline_id", "run_number", name="uq_pipeline_run_number"),
        Index("idx_run_status_started", "status", "started_at"),
        Index("idx_run_pipeline_created", "pipeline_id", "created_at"),
    )

    def __repr__(self):
        return f"<PipelineRun(id={self.id}, run_number={self.run_number}, status={self.status})>"  # noqa: E501


class StepRun(Base, AuditMixin):
    """Execution of a single pipeline node/operator"""

    __tablename__ = "step_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_run_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    node_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_nodes.id", ondelete="CASCADE"), nullable=False
    )

    operator_type: Mapped[OperatorType] = mapped_column(
        SQLEnum(OperatorType), nullable=False
    )
    status: Mapped[OperatorRunStatus] = mapped_column(
        SQLEnum(OperatorRunStatus),
        nullable=False,
        default=OperatorRunStatus.PENDING,
        index=True,
    )

    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    records_in: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    records_out: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    records_filtered: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    records_error: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    bytes_processed: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    duration_seconds: Mapped[float | None] = mapped_column(Float)
    cpu_percent: Mapped[float | None] = mapped_column(Float)
    memory_mb: Mapped[float | None] = mapped_column(Float)
    sample_data: Mapped[dict | None] = mapped_column(JSON)
    quality_profile: Mapped[dict | None] = mapped_column(JSON)
    lineage_map: Mapped[dict | None] = mapped_column(JSON)

    error_message: Mapped[str | None] = mapped_column(Text)
    error_type: Mapped[str | None] = mapped_column(String(255))

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    pipeline_run: Mapped[PipelineRun] = relationship(
        "PipelineRun", back_populates="step_runs"
    )
    node: Mapped[PipelineNode] = relationship("PipelineNode")

    # Ensure this relationship string matches the class name in monitoring.py
    logs: Mapped[list[StepLog]] = relationship(
        "StepLog", cascade="all, delete-orphan", order_by="StepLog.timestamp"
    )

    __table_args__ = (
        Index("idx_step_run_status", "pipeline_run_id", "status"),
        Index("idx_step_run_node", "node_id", "status"),
    )

    def __repr__(self):
        return f"<StepRun(id={self.id}, operator={self.operator_type}, status={self.status})>"  # noqa: E501


class PipelineRunContext(Base, AuditMixin):
    """Runtime parameters and context for pipeline execution"""

    __tablename__ = "pipeline_run_context"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_run_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    context: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict, server_default="{}"
    )
    parameters: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict, server_default="{}"
    )
    environment: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict, server_default="{}"
    )

    pipeline_run: Mapped[PipelineRun] = relationship(
        "PipelineRun", back_populates="context"
    )

    def __repr__(self):
        return f"<PipelineRunContext(pipeline_run_id={self.pipeline_run_id})>"


class Watermark(Base, AuditMixin):
    """Track incremental processing state per asset"""

    __tablename__ = "watermarks"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_id: Mapped[int] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    last_value: Mapped[dict | None] = mapped_column(JSON)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    watermark_column: Mapped[str | None] = mapped_column(String(255))
    watermark_type: Mapped[str] = mapped_column(
        String(50), default="timestamp", nullable=False
    )

    pipeline: Mapped[Pipeline] = relationship("Pipeline")
    asset: Mapped[Asset] = relationship("Asset", back_populates="watermarks")

    __table_args__ = (
        UniqueConstraint("pipeline_id", "asset_id", name="uq_watermark_pipeline_asset"),
        Index("idx_watermark_updated", "last_updated"),
    )

    def __repr__(self):
        return f"<Watermark(pipeline_id={self.pipeline_id}, asset_id={self.asset_id})>"
