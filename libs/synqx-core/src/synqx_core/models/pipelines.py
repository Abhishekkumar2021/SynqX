from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
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

from synqx_core.models.base import AuditMixin, Base, OwnerMixin, SoftDeleteMixin
from synqx_core.models.enums import (
    OperatorType,
    PipelineStatus,
    RetryStrategy,
    SchemaEvolutionPolicy,
    SyncMode,
    WriteStrategy,
)
from synqx_core.utils.agent import is_remote_group

if TYPE_CHECKING:
    from synqx_core.models.connections import Asset
    from synqx_core.models.execution import Job, PipelineRun
    from synqx_core.models.monitoring import SchedulerEvent
    from synqx_core.models.workspace import Workspace


class Pipeline(Base, AuditMixin, SoftDeleteMixin, OwnerMixin):
    __tablename__ = "pipelines"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)

    schedule_cron: Mapped[str | None] = mapped_column(String(100))
    schedule_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    schedule_timezone: Mapped[str] = mapped_column(
        String(50), default="UTC", nullable=False
    )

    status: Mapped[PipelineStatus] = mapped_column(
        SQLEnum(PipelineStatus), nullable=False, default=PipelineStatus.DRAFT
    )
    current_version: Mapped[int | None] = mapped_column(Integer)
    published_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("pipeline_versions.id", use_alter=True)
    )

    max_parallel_runs: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    retry_strategy: Mapped[RetryStrategy] = mapped_column(
        SQLEnum(RetryStrategy), default=RetryStrategy.FIXED, nullable=False
    )
    retry_delay_seconds: Mapped[int] = mapped_column(
        Integer, default=60, nullable=False
    )

    execution_timeout_seconds: Mapped[int | None] = mapped_column(Integer, default=3600)
    agent_group: Mapped[str] = mapped_column(
        String(100), index=True, server_default="internal", default="internal"
    )  # Target specific agent group/tag
    tags: Mapped[dict | None] = mapped_column(JSON, default=dict)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # Enterprise Ops
    sla_config: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # e.g. {"max_duration": 3600, "finish_by": "08:00"}
    upstream_pipeline_ids: Mapped[list | None] = mapped_column(
        JSON, default=list
    )  # List of pipeline IDs this depends on

    # Workspace scoping
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    workspace: Mapped[Workspace | None] = relationship(
        "Workspace", back_populates="pipelines"
    )
    versions: Mapped[list[PipelineVersion]] = relationship(
        cascade="all, delete-orphan",
        foreign_keys="PipelineVersion.pipeline_id",
        order_by="PipelineVersion.version.desc()",
    )
    # Using string references for modules not yet defined
    jobs: Mapped[list[Job]] = relationship(
        "Job", back_populates="pipeline", cascade="all, delete-orphan"
    )
    runs: Mapped[list[PipelineRun]] = relationship(
        "PipelineRun", back_populates="pipeline", cascade="all, delete-orphan"
    )
    scheduler_events: Mapped[list[SchedulerEvent]] = relationship(
        "SchedulerEvent", back_populates="pipeline", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_pipeline_schedule", "schedule_enabled", "schedule_cron"),
        CheckConstraint("max_parallel_runs > 0", name="ck_pipeline_max_parallel"),
        CheckConstraint("priority BETWEEN 1 AND 10", name="ck_pipeline_priority"),
    )

    @property
    def is_remote_group(self) -> bool:
        """
        Check if the pipeline is configured to use a remote agent group.
        Returns False if the agent group is 'internal'.
        """
        return is_remote_group(self.agent_group)

    def __repr__(self):
        return f"<Pipeline(id={self.id}, name='{self.name}', status={self.status})>"


class PipelineVersion(Base, AuditMixin):
    __tablename__ = "pipeline_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_id: Mapped[int] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )

    version: Mapped[int] = mapped_column(Integer, nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    change_summary: Mapped[dict | None] = mapped_column(JSON)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version_notes: Mapped[str | None] = mapped_column(Text)

    pipeline: Mapped[Pipeline] = relationship(
        back_populates="versions", foreign_keys=[pipeline_id]
    )
    nodes: Mapped[list[PipelineNode]] = relationship(
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="PipelineNode.order_index",
        lazy="selectin",
    )
    edges: Mapped[list[PipelineEdge]] = relationship(
        back_populates="version", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("pipeline_id", "version", name="uq_pipeline_version"),
        Index("idx_version_published", "pipeline_id", "is_published"),
    )

    @property
    def node_count(self) -> int:
        return len(self.nodes) if self.nodes else 0

    @property
    def edge_count(self) -> int:
        return len(self.edges) if self.edges else 0

    def __repr__(self):
        return (
            f"<PipelineVersion(pipeline_id={self.pipeline_id}, version={self.version})>"
        )


class PipelineNode(Base, AuditMixin):
    __tablename__ = "pipeline_nodes"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_version_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    node_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    operator_type: Mapped[OperatorType] = mapped_column(
        SQLEnum(OperatorType), nullable=False
    )
    operator_class: Mapped[str] = mapped_column(String(255), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    column_mapping: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # Track source_col -> dest_col
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    source_asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL")
    )
    destination_asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL")
    )

    # Data Reliability & Movement
    sync_mode: Mapped[SyncMode] = mapped_column(
        SQLEnum(SyncMode, values_callable=lambda obj: [e.value for e in obj]),
        default=SyncMode.FULL_LOAD,
        nullable=False,
    )
    write_strategy: Mapped[WriteStrategy] = mapped_column(
        SQLEnum(WriteStrategy, values_callable=lambda obj: [e.value for e in obj]),
        default=WriteStrategy.APPEND,
        nullable=False,
    )
    schema_evolution_policy: Mapped[SchemaEvolutionPolicy] = mapped_column(
        SQLEnum(
            SchemaEvolutionPolicy, values_callable=lambda obj: [e.value for e in obj]
        ),
        default=SchemaEvolutionPolicy.STRICT,
        nullable=False,
    )

    # Mission Critical: Governance & Quality
    data_contract: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # YAML-based contract rules
    guardrails: Mapped[list | None] = mapped_column(
        JSON, default=list
    )  # List of thresholds/rules
    quarantine_asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL")
    )

    # Real-time Capabilities
    cdc_config: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # e.g. {"slot_name": "...", "publication": "..."}

    # Advanced Orchestration: Dynamic Mapping (Fan-out)
    is_dynamic: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mapping_expr: Mapped[str | None] = mapped_column(
        String(500)
    )  # e.g. "inputs['prev_node'].rows" or "[1,2,3]"

    # Sub-pipeline Orchestration
    sub_pipeline_id: Mapped[int | None] = mapped_column(
        ForeignKey("pipelines.id", ondelete="SET NULL")
    )
    sub_pipeline: Mapped[Pipeline | None] = relationship(
        "Pipeline", foreign_keys=[sub_pipeline_id]
    )

    # Worker Routing (Heterogeneous DAGs)
    worker_tag: Mapped[str | None] = mapped_column(
        String(100)
    )  # Route specific node to tagged workers

    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    retry_strategy: Mapped[RetryStrategy] = mapped_column(
        SQLEnum(RetryStrategy), default=RetryStrategy.FIXED, nullable=False
    )
    retry_delay_seconds: Mapped[int] = mapped_column(
        Integer, default=60, nullable=False
    )

    timeout_seconds: Mapped[int | None] = mapped_column(Integer)

    version: Mapped[PipelineVersion] = relationship(back_populates="nodes")
    source_asset: Mapped[Asset | None] = relationship(
        foreign_keys=[source_asset_id], lazy="selectin"
    )
    destination_asset: Mapped[Asset | None] = relationship(
        foreign_keys=[destination_asset_id], lazy="selectin"
    )

    incoming_edges: Mapped[list[PipelineEdge]] = relationship(
        foreign_keys="PipelineEdge.to_node_id", back_populates="to_node"
    )
    outgoing_edges: Mapped[list[PipelineEdge]] = relationship(
        foreign_keys="PipelineEdge.from_node_id", back_populates="from_node"
    )

    __table_args__ = (
        UniqueConstraint(
            "pipeline_version_id", "node_id", name="uq_node_id_per_version"
        ),
        Index("idx_node_operator_type", "operator_type"),
        Index("idx_node_assets", "source_asset_id", "destination_asset_id"),
    )

    def __repr__(self):
        return f"<PipelineNode(id={self.id}, name='{self.name}', type={self.operator_type})>"  # noqa: E501

    @property
    def connection_id(self) -> int | None:
        """Derive connection_id from associated assets"""
        if self.source_asset:
            return self.source_asset.connection_id
        if self.destination_asset:
            return self.destination_asset.connection_id
        return None


class PipelineEdge(Base, AuditMixin):
    __tablename__ = "pipeline_edges"

    id: Mapped[int] = mapped_column(primary_key=True)
    pipeline_version_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    from_node_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_nodes.id", ondelete="CASCADE"), nullable=False
    )
    to_node_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_nodes.id", ondelete="CASCADE"), nullable=False
    )
    edge_type: Mapped[str] = mapped_column(
        String(50), default="data_flow", nullable=False
    )
    condition: Mapped[str | None] = mapped_column(
        String(500)
    )  # e.g. "inputs['prev'].count > 0"

    version: Mapped[PipelineVersion] = relationship(back_populates="edges")
    from_node: Mapped[PipelineNode] = relationship(
        foreign_keys=[from_node_id], back_populates="outgoing_edges", lazy="selectin"
    )
    to_node: Mapped[PipelineNode] = relationship(
        foreign_keys=[to_node_id], back_populates="incoming_edges", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint(
            "pipeline_version_id", "from_node_id", "to_node_id", name="uq_edge_unique"
        ),
        Index("idx_edge_from", "from_node_id"),
        Index("idx_edge_to", "to_node_id"),
        CheckConstraint("from_node_id != to_node_id", name="ck_edge_no_self_loop"),
    )

    def __repr__(self):
        return f"<PipelineEdge(from={self.from_node_id}, to={self.to_node_id})>"
