from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from synqx_core.models.enums import JobStatus, PipelineRunStatus, OperatorRunStatus, OperatorType, RetryStrategy


from synqx_core.schemas.pipeline import PipelineVersionRead

class JobBase(BaseModel):
    # ... (existing JobBase)
    pipeline_id: int
    pipeline_version_id: int
    status: JobStatus
    retry_count: int = 0
    max_retries: int = 3


class JobRead(JobBase):
    # ... (existing JobRead)
    id: int
    celery_task_id: Optional[str]
    correlation_id: str
    retry_strategy: RetryStrategy
    retry_delay_seconds: int
    infra_error: Optional[str]
    worker_id: Optional[str]
    queue_name: Optional[str]
    execution_time_ms: Optional[int]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobListResponse(BaseModel):
    jobs: List[JobRead]
    total: int
    limit: int
    offset: int


class JobCancelRequest(BaseModel):
    reason: Optional[str] = None


class JobRetryRequest(BaseModel):
    force: bool = Field(default=False, description="Force retry even if max retries reached")


class StepRunRead(BaseModel):
    id: int
    pipeline_run_id: int
    node_id: int
    operator_type: OperatorType
    status: OperatorRunStatus
    order_index: int
    retry_count: int
    
    source_asset_id: Optional[int] = None
    destination_asset_id: Optional[int] = None

    records_in: int
    records_out: int
    records_filtered: int
    records_error: int
    bytes_processed: int
    duration_seconds: Optional[float]
    cpu_percent: Optional[float]
    memory_mb: Optional[float]
    sample_data: Optional[Dict[str, Any]]
    quality_profile: Optional[Dict[str, Any]] = None
    lineage_map: Optional[Dict[str, Any]] = None
    error_message: Optional[str]
    error_type: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def extract_asset_ids(cls, data: Any) -> Any:
        if hasattr(data, 'node') and data.node:
            # When coming from ORM, 'data' is the StepRun object
            # We inject the IDs from the related node into the validation dictionary
            if isinstance(data, dict):
                data['source_asset_id'] = data.get('node', {}).get('source_asset_id')
                data['destination_asset_id'] = data.get('node', {}).get('destination_asset_id')
            else:
                # Direct attribute access on ORM object
                setattr(data, 'source_asset_id', data.node.source_asset_id)
                setattr(data, 'destination_asset_id', data.node.destination_asset_id)
        return data


class PipelineRunBase(BaseModel):
    pipeline_id: int
    pipeline_version_id: int
    run_number: int
    status: PipelineRunStatus


class PipelineRunRead(PipelineRunBase):
    id: int
    job_id: int
    total_nodes: int = 0
    total_extracted: int
    total_loaded: int
    total_failed: int
    bytes_processed: int
    error_message: Optional[str]
    failed_step_id: Optional[int]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineRunContextRead(BaseModel):
    context: Dict[str, Any]
    parameters: Dict[str, Any]
    environment: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class PipelineRunDetailRead(PipelineRunRead):
    version: Optional[PipelineVersionRead] = None # Will contain version nodes and edges
    step_runs: List[StepRunRead] = Field(default_factory=list)
    context: Optional[PipelineRunContextRead] = None


class PipelineRunListResponse(BaseModel):
    runs: List[PipelineRunRead]
    total: int
    limit: int
    offset: int


class JobLogRead(BaseModel):
    id: int
    job_id: int
    level: str
    message: str
    metadata_payload: Optional[Dict[str, Any]]
    timestamp: datetime
    source: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class StepLogRead(BaseModel):
    id: int
    step_run_id: int
    level: str
    message: str
    metadata_payload: Optional[Dict[str, Any]]
    timestamp: datetime
    source: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class UnifiedLogRead(BaseModel):
    id: int
    level: str
    message: str
    metadata_payload: Optional[Dict[str, Any]]
    timestamp: datetime
    source: Optional[str]
    job_id: Optional[int] = None
    step_run_id: Optional[int] = None
    type: str = "log"

    model_config = ConfigDict(from_attributes=True)