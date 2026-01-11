from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, model_validator
from synqx_core.models.enums import ConnectorType, AssetType


class ConnectionImpactRead(BaseModel):
    pipeline_count: int


class ConnectionUsageStatsRead(BaseModel):
    sync_success_rate: float
    average_latency_ms: Optional[float]
    data_extracted_gb_24h: Optional[float]
    last_24h_runs: int
    last_7d_runs: int


class ConnectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    connector_type: ConnectorType
    description: Optional[str] = Field(None, max_length=5000)
    tags: Optional[Dict[str, Any]] = Field(default_factory=dict)
    max_concurrent_connections: int = Field(default=5, ge=1, le=100)
    connection_timeout_seconds: int = Field(default=30, ge=1, le=300)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v: Any) -> Dict[str, Any]:
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
    config: Dict[str, Any] = Field(
        ..., description="Connection configuration (will be encrypted)"
    )

    @model_validator(mode='after')
    def validate_connection_config(self) -> 'ConnectionCreate':
        # Allow empty config for connectors that rely on asset-defined logic
        allowed_empty = [ConnectorType.CUSTOM_SCRIPT, ConnectorType.LOCAL_FILE]
        if self.connector_type not in allowed_empty and not self.config:
            raise ValueError("Connection config cannot be empty")
        return self


class ConnectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    config: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = None
    max_concurrent_connections: Optional[int] = Field(None, ge=1, le=100)
    connection_timeout_seconds: Optional[int] = Field(None, ge=1, le=300)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Connection name cannot be empty or only whitespace")
        return v.strip() if v else v


class ConnectionRead(ConnectionBase):
    id: int
    health_status: str
    last_test_at: Optional[datetime]
    last_schema_discovery_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    # Optional integrated metrics
    usage_stats: Optional[ConnectionUsageStatsRead] = None
    impact: Optional[ConnectionImpactRead] = None

    model_config = ConfigDict(from_attributes=True)


class ConnectionDetailRead(ConnectionRead):
    config: Optional[Dict[str, Any]] = None
    config_schema: Optional[Dict[str, Any]] = None
    asset_count: int = 0


class ConnectionListResponse(BaseModel):
    connections: List[ConnectionRead]
    total: int
    limit: int
    offset: int


class ConnectionTestRequest(BaseModel):
    config: Optional[Dict[str, Any]] = None


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


class AssetSchemaVersionBase(BaseModel):
    json_schema: Dict[str, Any]
    schema_hash: Optional[str] = Field(None, max_length=64)
    change_summary: Optional[Dict[str, Any]] = None
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
    fully_qualified_name: Optional[str] = Field(None, max_length=500)
    is_source: bool = True
    is_destination: bool = False
    is_incremental_capable: bool = False
    description: Optional[str] = Field(None, max_length=5000)
    config: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = Field(default_factory=dict)
    schema_metadata: Optional[Dict[str, Any]] = None
    row_count_estimate: Optional[int] = Field(None, ge=0)
    size_bytes_estimate: Optional[int] = Field(None, ge=0)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v: Any) -> Dict[str, Any]:
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
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    asset_type: Optional[AssetType] = None
    fully_qualified_name: Optional[str] = Field(None, max_length=500)
    is_source: Optional[bool] = None
    is_destination: Optional[bool] = None
    is_incremental_capable: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=5000)
    config: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = None
    schema_metadata: Optional[Dict[str, Any]] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Asset name cannot be empty or only whitespace")
        return v.strip() if v else v


class AssetBulkCreateItem(AssetBase):
    # Most fields are inherited from AssetBase.
    # We can override fields if needed, for example, to make them optional for bulk creation
    # For now, we'll rely on the defaults in AssetBase and require a name.
    pass

class AssetBulkCreate(BaseModel):
    assets: List[AssetBulkCreateItem] = Field(..., min_length=1)


class AssetBulkCreateResponse(BaseModel):
    successful_creates: int
    failed_creates: int
    total_requested: int
    failures: List[Dict[str, Any]] = Field(default_factory=list)


class AssetRead(AssetBase):
    id: int
    connection_id: int
    current_schema_version: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AssetDetailRead(AssetRead):
    connection_name: Optional[str] = None
    latest_schema: Optional[AssetSchemaVersionRead] = None
    schema_version_count: int = 0


class AssetListResponse(BaseModel):
    assets: List[AssetRead]
    total: int
    limit: int
    offset: int


class AssetDiscoverRequest(BaseModel):
    include_metadata: bool = Field(False, description="Include system assets")
    pattern: Optional[str] = Field(
        None, description="Pattern to filter assets (e.g., 'public.*')"
    )


class AssetDiscoverResponse(BaseModel):
    discovered_count: int
    assets: List[Dict[str, Any]]
    message: str


class SchemaDiscoveryRequest(BaseModel):
    sample_size: int = Field(default=1000, ge=1, le=100000)
    force_refresh: bool = False


class SchemaDiscoveryResponse(BaseModel):
    success: bool
    schema_version: Optional[int] = None
    is_breaking_change: bool = False
    message: str
    discovered_schema: Optional[Dict[str, Any]] = None


class AssetSampleRead(BaseModel):
    asset_id: int
    rows: List[Dict[str, Any]]
    count: int


class ConnectionEnvironmentInfo(BaseModel):
    python_version: Optional[str] = None
    platform: Optional[str] = None
    pandas_version: Optional[str] = None
    numpy_version: Optional[str] = None
    base_path: Optional[str] = None
    available_tools: Dict[str, str] = Field(default_factory=dict)
    installed_packages: Dict[str, str] = Field(default_factory=dict)
    node_version: Optional[str] = None
    npm_packages: Dict[str, str] = Field(default_factory=dict)
    initialized_languages: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)
