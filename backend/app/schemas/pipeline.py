from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from croniter import croniter
from app.models.enums import PipelineStatus, OperatorType, RetryStrategy


class PipelineNodeBase(BaseModel):
    node_id: str = Field(..., min_length=1, max_length=255)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    operator_type: OperatorType
    operator_class: str = Field(..., min_length=1, max_length=255)
    config: Dict[str, Any] = Field(default_factory=dict)
    order_index: int = Field(..., ge=0)
    source_asset_id: Optional[int] = Field(None, gt=0)
    destination_asset_id: Optional[int] = Field(None, gt=0)
    connection_id: Optional[int] = None
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_strategy: RetryStrategy = Field(default=RetryStrategy.FIXED)
    retry_delay_seconds: int = Field(default=60, ge=0, le=3600)
    timeout_seconds: Optional[int] = Field(None, gt=0, le=86400)

    @field_validator("node_id")
    @classmethod
    def validate_node_id(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "node_id must contain only alphanumeric characters, hyphens, and underscores"
            )
        return v


class PipelineNodeCreate(PipelineNodeBase):
    pass


class PipelineNodeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    config: Optional[Dict[str, Any]] = None
    max_retries: Optional[int] = Field(None, ge=0, le=10)
    timeout_seconds: Optional[int] = Field(None, gt=0, le=86400)


class PipelineNodeRead(PipelineNodeBase):
    id: int
    pipeline_version_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
        # If we have the integer ID but need the string node_id, we need to access the relationship.
        # When loaded from ORM, 'v' is the integer foreign key.
        # But we can't easily access the sibling relationship attribute (e.g. from_node) from here 
        # because 'v' is just the value.
        # However, Pydantic's 'from_attributes' (ORM mode) usually maps attributes by name.
        # Since the model has 'from_node_id' (int) and 'from_node' (object),
        # we can't map 'from_node_id' directly to the string if the source is an int.
        
        # Strategy: We assume the object being validated is the ORM PipelineEdge object.
        # We can use a model_validator (root validator) to extract the string IDs from the relationships.
        return str(v)

    @model_validator(mode="before")
    @classmethod
    def extract_node_ids(cls, data: Any) -> Any:
        # This handles the ORM object case
        if hasattr(data, "from_node") and data.from_node:
            # We construct a dict or modify if it's a dict, but 'data' is the ORM object.
            # We can return a dict with the values we want.
            # But converting the whole ORM object to dict is expensive/complex here.
            # Easier way: The Pydantic model fields are 'from_node_id' and 'to_node_id'.
            # We want these to be populated with 'from_node.node_id' and 'to_node.node_id'.
            
            # We can create a proxy or dict.
            return {
                "id": data.id,
                "pipeline_version_id": data.pipeline_version_id,
                "from_node_id": data.from_node.node_id,
                "to_node_id": data.to_node.node_id,
                "edge_type": data.edge_type,
                "created_at": data.created_at,
                "updated_at": data.updated_at
            }
        return data


class PipelineVersionBase(BaseModel):
    config_snapshot: Dict[str, Any] = Field(default_factory=dict)
    change_summary: Optional[Dict[str, Any]] = None
    version_notes: Optional[str] = Field(None, max_length=5000)


class PipelineVersionCreate(PipelineVersionBase):
    nodes: List[PipelineNodeCreate] = Field(default_factory=list, min_length=1)
    edges: List[PipelineEdgeCreate] = Field(default_factory=list)

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
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    nodes: List[PipelineNodeRead] = Field(default_factory=list)
    edges: List[PipelineEdgeRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PipelineVersionSummary(BaseModel):
    id: int
    version: int
    is_published: bool
    published_at: Optional[datetime]
    node_count: int
    edge_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PipelineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    schedule_cron: Optional[str] = Field(None, max_length=100)
    schedule_enabled: bool = Field(default=False)
    schedule_timezone: str = Field(default="UTC", max_length=50)
    max_parallel_runs: int = Field(default=1, ge=1, le=100)
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_strategy: RetryStrategy = Field(default=RetryStrategy.FIXED)
    retry_delay_seconds: int = Field(default=60, ge=0, le=3600)
    execution_timeout_seconds: Optional[int] = Field(None, gt=0, le=86400)
    agent_group: Optional[str] = Field(None, max_length=100)
    tags: Optional[Dict[str, Any]] = Field(default_factory=dict)
    priority: int = Field(default=5, ge=1, le=10)

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
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                croniter(v)
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {str(e)}")
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
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    schedule_cron: Optional[str] = Field(None, max_length=100)
    schedule_enabled: Optional[bool] = None
    schedule_timezone: Optional[str] = Field(None, max_length=50)
    status: Optional[PipelineStatus] = None
    max_parallel_runs: Optional[int] = Field(None, ge=1, le=100)
    max_retries: Optional[int] = Field(None, ge=0, le=10)
    retry_strategy: Optional[RetryStrategy] = None
    retry_delay_seconds: Optional[int] = Field(None, ge=0, le=3600)
    execution_timeout_seconds: Optional[int] = Field(None, gt=0, le=86400)
    runner_group: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    priority: Optional[int] = Field(None, ge=1, le=10)

    @field_validator("schedule_cron")
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                croniter(v)
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {str(e)}")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Pipeline name cannot be empty or only whitespace")
        return v.strip() if v else v


class PipelineRead(PipelineBase):
    id: int
    status: PipelineStatus
    current_version: Optional[int]
    published_version_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PipelineDetailRead(PipelineRead):
    published_version: Optional[PipelineVersionRead] = None
    latest_version: Optional[PipelineVersionRead] = None
    versions: List[PipelineVersionSummary] = Field(default_factory=list)


class PipelineListResponse(BaseModel):
    pipelines: List[PipelineRead]
    total: int
    limit: int
    offset: int


class PipelineTriggerRequest(BaseModel):
    version_id: Optional[int] = None
    run_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    async_execution: bool = Field(default=True)


class PipelineTriggerResponse(BaseModel):
    status: str
    message: str
    job_id: int
    task_id: Optional[str] = None
    pipeline_id: int
    version_id: int


class PipelinePublishRequest(BaseModel):
    version_notes: Optional[str] = Field(None, max_length=5000)


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
    errors: List[PipelineValidationError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class PipelineStatsResponse(BaseModel):
    pipeline_id: int
    total_runs: int
    successful_runs: int
    failed_runs: int
    total_quarantined: int = 0
    total_records_processed: int = 0
    average_duration_seconds: Optional[float]
    last_run_at: Optional[datetime]
    next_scheduled_run: Optional[datetime]

class NodeDiff(BaseModel):
    node_id: str
    changes: Dict[str, Any]

class PipelineDiffResponse(BaseModel):
    base_version: int
    target_version: int
    nodes: Dict[str, Any]
    edges: Dict[str, Any]
