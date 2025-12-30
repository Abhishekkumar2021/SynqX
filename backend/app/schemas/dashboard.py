from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

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

class DashboardStats(BaseModel):
    total_pipelines: int
    active_pipelines: int
    total_connections: int
    connector_health: List[ConnectorHealth] = []
    
    # Period stats
    total_jobs: int
    success_rate: float
    avg_duration: float
    total_rows: int = 0
    total_bytes: int = 0
    
    throughput: List[ThroughputDataPoint]
    pipeline_distribution: List[PipelineDistribution]
    recent_activity: List[RecentActivity]

    # New Metrics
    system_health: Optional[SystemHealth] = None
    top_failing_pipelines: List[FailingPipeline] = []
    slowest_pipelines: List[SlowestPipeline] = []
    recent_alerts: List[DashboardAlert] = []

    model_config = ConfigDict(from_attributes=True)