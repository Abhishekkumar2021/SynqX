from datetime import datetime

from pydantic import BaseModel, ConfigDict
from synqx_core.schemas.audit import AuditLogRead
from synqx_core.schemas.ephemeral import EphemeralJobResponse


class ThroughputDataPoint(BaseModel):
    timestamp: datetime
    success_count: int
    failure_count: int
    rows_processed: int = 0
    bytes_processed: int = 0

    model_config = ConfigDict(from_attributes=True)


class PipelineDistribution(BaseModel):
    status: str
    count: int


class RecentActivity(BaseModel):
    id: int
    pipeline_id: int
    pipeline_name: str
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: float | None
    user_avatar: str | None = None  # Placeholder for frontend compatibility


class SystemHealth(BaseModel):
    cpu_percent: float
    memory_usage_mb: float
    active_workers: int
    active_cdc_streams: int = 0
    active_cdc_streams: int = 0


class FailingPipeline(BaseModel):
    id: int
    name: str
    failure_count: int


class SlowestPipeline(BaseModel):
    id: int
    name: str
    avg_duration: float


class DashboardAlert(BaseModel):
    id: int
    message: str
    level: str
    created_at: datetime
    pipeline_id: int | None = None


class ConnectorHealth(BaseModel):
    status: str
    count: int


class QualityTrendDataPoint(BaseModel):
    timestamp: datetime
    valid_rows: int
    failed_rows: int
    compliance_score: float  # 0-100


class QualityViolation(BaseModel):
    rule_type: str  # e.g. "not_null", "unique"
    column_name: str
    count: int


class AgentGroupStats(BaseModel):
    name: str
    count: int
    status: str  # 'active', 'idle', 'offline'


class DashboardStats(BaseModel):
    total_pipelines: int
    active_pipelines: int
    total_connections: int
    connector_health: list[ConnectorHealth] = []

    # Agent Stats
    total_agents: int = 0
    active_agents: int = 0
    agent_groups: list[AgentGroupStats] = []

    # Period stats
    total_jobs: int
    success_rate: float
    avg_duration: float
    total_rows: int = 0
    total_rejected_rows: int = 0
    active_issues: int = 0
    resolution_rate: float = 0.0
    total_bytes: int = 0

    # Inventory Stats
    total_users: int = 0
    total_assets: int = 0

    throughput: list[ThroughputDataPoint]
    pipeline_distribution: list[PipelineDistribution]
    recent_activity: list[RecentActivity]

    # New Metrics
    system_health: SystemHealth | None = None
    top_failing_pipelines: list[FailingPipeline] = []
    slowest_pipelines: list[SlowestPipeline] = []

    # Data Quality
    quality_trend: list[QualityTrendDataPoint] = []
    top_violations: list[QualityViolation] = []

    recent_alerts: list[DashboardAlert] = []
    recent_audit_logs: list[AuditLogRead] = []
    recent_ephemeral_jobs: list[EphemeralJobResponse] = []

    model_config = ConfigDict(from_attributes=True)
