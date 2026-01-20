from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator
from synqx_core.models.enums import (
    JobStatus,
    OperatorRunStatus,
    OperatorType,
    PipelineRunStatus,
    RetryStrategy,
)
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
    celery_task_id: str | None
    correlation_id: str
    retry_strategy: RetryStrategy
    retry_delay_seconds: int
    infra_error: str | None
    worker_id: str | None
    queue_name: str | None
    execution_time_ms: int | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobListResponse(BaseModel):
    jobs: list[JobRead]
    total: int
    limit: int
    offset: int


class JobCancelRequest(BaseModel):
    reason: str | None = None


class JobRetryRequest(BaseModel):
    force: bool = Field(
        default=False, description="Force retry even if max retries reached"
    )


class StepRunRead(BaseModel):
    id: int
    pipeline_run_id: int
    node_id: int
    operator_type: OperatorType
    status: OperatorRunStatus
    order_index: int
    retry_count: int

    source_asset_id: int | None = None
    destination_asset_id: int | None = None

    records_in: int
    records_out: int
    records_filtered: int
    records_error: int
    bytes_processed: int
    duration_seconds: float | None
    cpu_percent: float | None
    memory_mb: float | None
    sample_data: dict[str, Any] | None
    error_message: str | None
    error_type: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_asset_ids(cls, data: Any) -> Any:
        if hasattr(data, "node") and data.node:
            # When coming from ORM, 'data' is the StepRun object
            # We inject the IDs from the related node into the validation dictionary
            if isinstance(data, dict):
                data["source_asset_id"] = data.get("node", {}).get("source_asset_id")
                data["destination_asset_id"] = data.get("node", {}).get(
                    "destination_asset_id"
                )
            else:
                # Direct attribute access on ORM object
                data.source_asset_id = data.node.source_asset_id
                data.destination_asset_id = data.node.destination_asset_id
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
    error_message: str | None
    failed_step_id: int | None
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: float | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineRunContextRead(BaseModel):
    context: dict[str, Any]
    parameters: dict[str, Any]
    environment: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class PipelineRunDetailRead(PipelineRunRead):
    version: PipelineVersionRead | None = None  # Will contain version nodes and edges
    step_runs: list[StepRunRead] = Field(default_factory=list)
    context: PipelineRunContextRead | None = None


class PipelineRunListResponse(BaseModel):
    runs: list[PipelineRunRead]
    total: int
    limit: int
    offset: int


class JobLogRead(BaseModel):
    id: int
    job_id: int
    level: str
    message: str
    metadata_payload: dict[str, Any] | None
    timestamp: datetime
    source: str | None

    model_config = ConfigDict(from_attributes=True)


class StepLogRead(BaseModel):
    id: int
    step_run_id: int
    level: str
    message: str
    metadata_payload: dict[str, Any] | None
    timestamp: datetime
    source: str | None

    model_config = ConfigDict(from_attributes=True)


class UnifiedLogRead(BaseModel):
    id: int
    level: str
    message: str
    metadata_payload: dict[str, Any] | None
    timestamp: datetime
    source: str | None
    job_id: int | None = None
    step_run_id: int | None = None
    type: str = "log"

    model_config = ConfigDict(from_attributes=True)
