from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.schemas.audit import AuditLogRead
from app.schemas.ephemeral import EphemeralJobResponse

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
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    user_avatar: Optional[str] = None # Placeholder for frontend compatibility

class SystemHealth(BaseModel):
    cpu_percent: float
    memory_usage_mb: float
    active_workers: int

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
    pipeline_id: Optional[int] = None

class ConnectorHealth(BaseModel):
    status: str
    count: int

class QualityTrendDataPoint(BaseModel):
    timestamp: datetime
    valid_rows: int
    failed_rows: int
    compliance_score: float # 0-100

class QualityViolation(BaseModel):
    rule_type: str # e.g. "not_null", "unique"
    column_name: str
    count: int

class AgentGroupStats(BaseModel):
    name: str
    count: int
    status: str # 'active', 'idle', 'offline'

class DashboardStats(BaseModel):
    total_pipelines: int
    active_pipelines: int
    total_connections: int
    connector_health: List[ConnectorHealth] = []
    
    # Agent Stats
    total_agents: int = 0
    active_agents: int = 0
    agent_groups: List[AgentGroupStats] = []

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
    
    throughput: List[ThroughputDataPoint]
    pipeline_distribution: List[PipelineDistribution]
    recent_activity: List[RecentActivity]

    # New Metrics
    system_health: Optional[SystemHealth] = None
    top_failing_pipelines: List[FailingPipeline] = []
    slowest_pipelines: List[SlowestPipeline] = []
    
    # Data Quality
    quality_trend: List[QualityTrendDataPoint] = []
    top_violations: List[QualityViolation] = []
    
    recent_alerts: List[DashboardAlert] = []
    recent_audit_logs: List[AuditLogRead] = []
    recent_ephemeral_jobs: List[EphemeralJobResponse] = []

    model_config = ConfigDict(from_attributes=True)