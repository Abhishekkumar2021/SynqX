from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from synqx_core.models.enums import AssetType, ConnectorType


class ConnectionImpactRead(BaseModel):
    pipeline_count: int


class ConnectionUsageStatsRead(BaseModel):
    sync_success_rate: float
    average_latency_ms: float | None
    data_extracted_gb_24h: float | None
    last_24h_runs: int
    last_7d_runs: int


class ConnectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    connector_type: ConnectorType
    description: str | None = Field(None, max_length=5000)
    tags: dict[str, Any] | None = Field(default_factory=dict)
    max_concurrent_connections: int = Field(default=5, ge=1, le=100)
    connection_timeout_seconds: int = Field(default=30, ge=1, le=300)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v: Any) -> dict[str, Any]:
        if v is None:
            return {}
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Connection name cannot be empty or only whitespace")
        return v.strip()


class ConnectionCreate(ConnectionBase):
    config: dict[str, Any] = Field(
        ..., description="Connection configuration (will be encrypted)"
    )
    validate_on_create: bool = Field(
        default=True, description="Whether to test connection immediately"
    )

    @model_validator(mode="after")
    def validate_connection_config(self) -> ConnectionCreate:
        # Allow empty config for connectors that rely on asset-defined logic
        allowed_empty = [ConnectorType.CUSTOM_SCRIPT, ConnectorType.LOCAL_FILE]
        if self.connector_type not in allowed_empty and not self.config:
            raise ValueError("Connection config cannot be empty")
        return self


class ConnectionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=5000)
    config: dict[str, Any] | None = None
    tags: dict[str, Any] | None = None
    max_concurrent_connections: int | None = Field(None, ge=1, le=100)
    connection_timeout_seconds: int | None = Field(None, ge=1, le=300)
    validate_on_update: bool = Field(
        default=True, description="Whether to test connection immediately"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Connection name cannot be empty or only whitespace")
        return v.strip() if v else v


class ConnectionRead(ConnectionBase):
    id: int
    health_status: str
    last_test_at: datetime | None
    last_schema_discovery_at: datetime | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    # Optional integrated metrics
    usage_stats: ConnectionUsageStatsRead | None = None
    impact: ConnectionImpactRead | None = None

    model_config = ConfigDict(from_attributes=True)


class ConnectionDetailRead(ConnectionRead):
    config: dict[str, Any] | None = None
    config_schema: dict[str, Any] | None = None
    asset_count: int = 0


class ConnectionListResponse(BaseModel):
    connections: list[ConnectionRead]
    total: int
    limit: int
    offset: int


class ConnectionTestRequest(BaseModel):
    config: dict[str, Any] | None = None


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: float | None = None
    details: dict[str, Any] | None = None


class ConnectionTestAdhocRequest(BaseModel):
    connector_type: ConnectorType
    config: dict[str, Any]


class AssetSchemaVersionBase(BaseModel):
    json_schema: dict[str, Any]
    schema_hash: str | None = Field(None, max_length=64)
    change_summary: dict[str, Any] | None = None
    is_breaking_change: bool = False


class AssetSchemaVersionRead(AssetSchemaVersionBase):
    id: int
    asset_id: int
    version: int
    discovered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    asset_type: AssetType
    fully_qualified_name: str | None = Field(None, max_length=500)
    is_source: bool = True
    is_destination: bool = False
    is_incremental_capable: bool = False
    description: str | None = Field(None, max_length=5000)
    config: dict[str, Any] | None = None
    tags: dict[str, Any] | None = Field(default_factory=dict)
    schema_metadata: dict[str, Any] | None = None
    row_count_estimate: int | None = Field(None, ge=0)
    size_bytes_estimate: int | None = Field(None, ge=0)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v: Any) -> dict[str, Any]:
        if v is None:
            return {}
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Asset name cannot be empty or only whitespace")
        return v.strip()


class AssetCreate(AssetBase):
    connection_id: int = Field(..., gt=0)


class AssetUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    asset_type: AssetType | None = None
    fully_qualified_name: str | None = Field(None, max_length=500)
    is_source: bool | None = None
    is_destination: bool | None = None
    is_incremental_capable: bool | None = None
    description: str | None = Field(None, max_length=5000)
    config: dict[str, Any] | None = None
    tags: dict[str, Any] | None = None
    schema_metadata: dict[str, Any] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Asset name cannot be empty or only whitespace")
        return v.strip() if v else v


class AssetBulkCreateItem(AssetBase):
    # Most fields are inherited from AssetBase.
    # We can override fields if needed, for example, to make them optional for bulk creation  # noqa: E501
    # For now, we'll rely on the defaults in AssetBase and require a name.
    pass


class AssetBulkCreate(BaseModel):
    assets: list[AssetBulkCreateItem] = Field(..., min_length=1)


class AssetBulkCreateResponse(BaseModel):
    successful_creates: int
    failed_creates: int
    total_requested: int
    failures: list[dict[str, Any]] = Field(default_factory=list)


class AssetRead(AssetBase):
    id: int
    connection_id: int
    current_schema_version: int | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AssetDetailRead(AssetRead):
    connection_name: str | None = None
    latest_schema: AssetSchemaVersionRead | None = None
    schema_version_count: int = 0


class AssetListResponse(BaseModel):
    assets: list[AssetRead]
    total: int
    limit: int
    offset: int


class AssetDiscoverRequest(BaseModel):
    include_metadata: bool = Field(False, description="Include system assets")
    pattern: str | None = Field(
        None, description="Pattern to filter assets (e.g., 'public.*')"
    )


class AssetDiscoverResponse(BaseModel):
    discovered_count: int
    assets: list[dict[str, Any]]
    message: str


class SchemaDiscoveryRequest(BaseModel):
    sample_size: int = Field(default=1000, ge=1, le=100000)
    force_refresh: bool = False


class SchemaDiscoveryResponse(BaseModel):
    success: bool
    schema_version: int | None = None
    is_breaking_change: bool = False
    message: str
    discovered_schema: dict[str, Any] | None = None


class AssetSampleRead(BaseModel):
    asset_id: int
    rows: list[dict[str, Any]]
    count: int


class ConnectionEnvironmentInfo(BaseModel):
    python_version: str | None = None
    platform: str | None = None
    pandas_version: str | None = None
    numpy_version: str | None = None
    base_path: str | None = None
    available_tools: dict[str, str] = Field(default_factory=dict)
    installed_packages: dict[str, str] = Field(default_factory=dict)
    node_version: str | None = None
    npm_packages: dict[str, str] = Field(default_factory=dict)
    initialized_languages: list[str] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
