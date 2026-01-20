from datetime import datetime
from typing import Any

from croniter import croniter
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from synqx_core.models.enums import (
    OperatorType,
    PipelineStatus,
    RetryStrategy,
    SchemaEvolutionPolicy,
    SyncMode,
    WriteStrategy,
)


class PipelineNodeBase(BaseModel):
    node_id: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    operator_type: OperatorType
    operator_class: str = Field(..., min_length=1, max_length=255)
    config: dict[str, Any] = Field(default_factory=dict)
    order_index: int = Field(..., ge=0)
    source_asset_id: int | None = Field(None, gt=0)
    destination_asset_id: int | None = Field(None, gt=0)
    connection_id: int | None = None

    # Data Reliability & Movement
    sync_mode: SyncMode = Field(default=SyncMode.FULL_LOAD)
    write_strategy: WriteStrategy = Field(default=WriteStrategy.APPEND)
    schema_evolution_policy: SchemaEvolutionPolicy = Field(
        default=SchemaEvolutionPolicy.STRICT
    )

    # Mission Critical: Governance & Quality
    data_contract: dict[str, Any] | None = Field(default_factory=dict)
    guardrails: list[dict[str, Any]] | None = Field(default_factory=list)
    quarantine_asset_id: int | None = Field(None, gt=0)

    # Real-time Capabilities
    cdc_config: dict[str, Any] | None = Field(default_factory=dict)

    max_retries: int = Field(default=3, ge=0, le=10)
    retry_strategy: RetryStrategy = Field(default=RetryStrategy.FIXED)
    retry_delay_seconds: int = Field(default=60, ge=0, le=3600)
    timeout_seconds: int | None = Field(None, gt=0, le=86400)

    @field_validator("node_id")
    @classmethod
    def validate_node_id(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "node_id must contain only alphanumeric characters, hyphens, and underscores"  # noqa: E501
            )
        return v


class PipelineNodeCreate(PipelineNodeBase):
    pass


class PipelineNodeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    config: dict[str, Any] | None = None
    sync_mode: SyncMode | None = None
    cdc_config: dict[str, Any] | None = None
    max_retries: int | None = Field(None, ge=0, le=10)
    timeout_seconds: int | None = Field(None, gt=0, le=86400)


class PipelineNodeRead(PipelineNodeBase):
    id: int
    pipeline_version_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_connection_id(cls, data: Any) -> Any:
        if hasattr(data, "connection_id") and data.connection_id:
            return data

        # If it's an ORM object, try to use the property
        if hasattr(data, "source_asset") and data.source_asset:
            data.connection_id = data.source_asset.connection_id
        elif hasattr(data, "destination_asset") and data.destination_asset:
            data.connection_id = data.destination_asset.connection_id

        return data


class PipelineEdgeBase(BaseModel):
    from_node_id: str = Field(..., min_length=1, max_length=255)
    to_node_id: str = Field(..., min_length=1, max_length=255)
    edge_type: str = Field(default="data_flow", max_length=50)

    @model_validator(mode="after")
    def validate_no_self_loop(self):
        if self.from_node_id == self.to_node_id:
            raise ValueError(
                "Self-loops are not allowed: from_node_id cannot equal to_node_id"
            )
        return self


class PipelineEdgeCreate(PipelineEdgeBase):
    pass


class PipelineEdgeRead(PipelineEdgeBase):
    id: int
    pipeline_version_id: int
    from_node_id: str
    to_node_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("from_node_id", "to_node_id", mode="before")
    @classmethod
    def convert_node_id_to_str(cls, v: Any, info: Any) -> str:
        # If we have the integer ID but need the string node_id, we need to access the relationship.  # noqa: E501
        # When loaded from ORM, 'v' is the integer foreign key.
        # But we can't easily access the sibling relationship attribute (e.g. from_node) from here  # noqa: E501
        # because 'v' is just the value.
        # However, Pydantic's 'from_attributes' (ORM mode) usually maps attributes by name.  # noqa: E501
        # Since the model has 'from_node_id' (int) and 'from_node' (object),
        # we can't map 'from_node_id' directly to the string if the source is an int.

        # Strategy: We assume the object being validated is the ORM PipelineEdge object.
        # We can use a model_validator (root validator) to extract the string IDs from the relationships.  # noqa: E501
        return str(v)

    @model_validator(mode="before")
    @classmethod
    def extract_node_ids(cls, data: Any) -> Any:
        # This handles the ORM object case
        if hasattr(data, "from_node") and data.from_node:
            # We construct a dict or modify if it's a dict, but 'data' is the ORM object.  # noqa: E501
            # We can return a dict with the values we want.
            # But converting the whole ORM object to dict is expensive/complex here.
            # Easier way: The Pydantic model fields are 'from_node_id' and 'to_node_id'.
            # We want these to be populated with 'from_node.node_id' and 'to_node.node_id'.  # noqa: E501

            # We can create a proxy or dict.
            return {
                "id": data.id,
                "pipeline_version_id": data.pipeline_version_id,
                "from_node_id": data.from_node.node_id,
                "to_node_id": data.to_node.node_id,
                "edge_type": data.edge_type,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class PipelineVersionBase(BaseModel):
    config_snapshot: dict[str, Any] = Field(default_factory=dict)
    change_summary: dict[str, Any] | None = None
    version_notes: str | None = Field(None, max_length=5000)


class PipelineVersionCreate(PipelineVersionBase):
    nodes: list[PipelineNodeCreate] = Field(default_factory=list, min_length=1)
    edges: list[PipelineEdgeCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_nodes_and_edges(self):
        if not self.nodes:
            raise ValueError("Pipeline version must have at least one node")

        node_ids = {node.node_id for node in self.nodes}

        if len(node_ids) != len(self.nodes):
            raise ValueError("Duplicate node_id values are not allowed")

        for edge in self.edges:
            if edge.from_node_id not in node_ids:
                raise ValueError(
                    f"Edge references non-existent from_node_id: {edge.from_node_id}"
                )
            if edge.to_node_id not in node_ids:
                raise ValueError(
                    f"Edge references non-existent to_node_id: {edge.to_node_id}"
                )

        return self


class PipelineVersionRead(PipelineVersionBase):
    id: int
    pipeline_id: int
    version: int
    is_published: bool
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    nodes: list[PipelineNodeRead] = Field(default_factory=list)
    edges: list[PipelineEdgeRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PipelineVersionSummary(BaseModel):
    id: int
    version: int
    is_published: bool
    published_at: datetime | None
    version_notes: str | None = None
    node_count: int
    edge_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    schedule_cron: str | None = Field(None, max_length=100)
    schedule_enabled: bool = Field(default=False)
    schedule_timezone: str = Field(default="UTC", max_length=50)
    max_parallel_runs: int = Field(default=1, ge=1, le=100)
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_strategy: RetryStrategy = Field(default=RetryStrategy.FIXED)
    retry_delay_seconds: int = Field(default=60, ge=0, le=3600)
    execution_timeout_seconds: int | None = Field(None, gt=0, le=86400)
    agent_group: str | None = Field(None, max_length=100)
    tags: dict[str, Any] | None = Field(default_factory=dict)
    priority: int = Field(default=5, ge=1, le=10)

    # Enterprise Ops
    sla_config: dict[str, Any] | None = Field(default_factory=dict)
    upstream_pipeline_ids: list[int] | None = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if v is None:
            return {}
        if isinstance(v, list) and not v:
            return {}
        return v

    @field_validator("schedule_cron")
    @classmethod
    def validate_cron(cls, v: str | None) -> str | None:
        if v is not None:
            try:
                croniter(v)
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {e!s}")  # noqa: B904
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Pipeline name cannot be empty or only whitespace")
        return v.strip()


class PipelineCreate(PipelineBase):
    initial_version: PipelineVersionCreate

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.schedule_enabled and not self.schedule_cron:
            raise ValueError("schedule_cron is required when schedule_enabled is True")
        return self


class PipelineUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    schedule_cron: str | None = Field(None, max_length=100)
    schedule_enabled: bool | None = None
    schedule_timezone: str | None = Field(None, max_length=50)
    status: PipelineStatus | None = None
    max_parallel_runs: int | None = Field(None, ge=1, le=100)
    max_retries: int | None = Field(None, ge=0, le=10)
    retry_strategy: RetryStrategy | None = None
    retry_delay_seconds: int | None = Field(None, ge=0, le=3600)
    execution_timeout_seconds: int | None = Field(None, gt=0, le=86400)
    agent_group: str | None = None
    tags: dict[str, Any] | None = None
    priority: int | None = Field(None, ge=1, le=10)
    sla_config: dict[str, Any] | None = None
    upstream_pipeline_ids: list[int] | None = None

    @field_validator("schedule_cron")
    @classmethod
    def validate_cron(cls, v: str | None) -> str | None:
        if v is not None:
            try:
                croniter(v)
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {e!s}")  # noqa: B904
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Pipeline name cannot be empty or only whitespace")
        return v.strip() if v else v


class PipelineRead(PipelineBase):
    id: int
    status: PipelineStatus
    is_remote_group: bool
    current_version: int | None
    published_version_id: int | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PipelineDetailRead(PipelineRead):
    published_version: PipelineVersionRead | None = None
    latest_version: PipelineVersionRead | None = None
    versions: list[PipelineVersionSummary] = Field(default_factory=list)


class PipelineListResponse(BaseModel):
    pipelines: list[PipelineRead]
    total: int
    limit: int
    offset: int


class PipelineTriggerRequest(BaseModel):
    version_id: int | None = None
    run_params: dict[str, Any] | None = Field(default_factory=dict)
    async_execution: bool = Field(default=True)
    is_backfill: bool = Field(default=False)
    backfill_config: dict[str, Any] | None = Field(default_factory=dict)


class PipelineBackfillRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    version_id: int | None = None
    # interval: Literal["daily", "hourly"] = "daily"


class PipelineTriggerResponse(BaseModel):
    status: str
    message: str
    job_id: int
    task_id: str | None = None
    pipeline_id: int
    version_id: int


class PipelinePublishRequest(BaseModel):
    version_notes: str | None = Field(None, max_length=5000)


class PipelinePublishResponse(BaseModel):
    message: str
    version_id: int
    version_number: int
    published_at: datetime


class PipelineValidationError(BaseModel):
    field: str
    message: str
    error_type: str


class PipelineValidationResponse(BaseModel):
    valid: bool
    errors: list[PipelineValidationError] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class PipelineStatsResponse(BaseModel):
    pipeline_id: int
    total_runs: int
    successful_runs: int
    failed_runs: int
    total_quarantined: int = 0
    total_records_processed: int = 0
    average_duration_seconds: float | None
    last_run_at: datetime | None
    next_scheduled_run: datetime | None


class NodeDiff(BaseModel):
    node_id: str
    changes: dict[str, Any]


class PipelineDiffResponse(BaseModel):
    base_version: int
    target_version: int
    nodes: dict[str, Any]
    edges: dict[str, Any]
