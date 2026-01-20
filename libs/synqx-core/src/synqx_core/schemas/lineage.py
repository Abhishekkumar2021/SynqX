from typing import Any

from pydantic import BaseModel


class LineageNode(BaseModel):
    id: str  # composite "asset_{id}" or "pipeline_{id}"
    type: str  # "asset", "pipeline", "transformation"
    label: str
    data: dict[
        str, Any
    ]  # Store asset_type, status, row_count, size_bytes, schema_version, last_updated, health_score  # noqa: E501


class LineageEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None
    data: dict[
        str, Any
    ] = {}  # pipeline_id, run_status, avg_duration, success_rate, last_run_at


class LineageGraph(BaseModel):
    nodes: list[LineageNode]
    edges: list[LineageEdge]
    stats: dict[str, Any]


class ImpactAnalysis(BaseModel):
    asset_id: int
    downstream_pipelines: list[dict[str, Any]]
    downstream_assets: list[dict[str, Any]]
    affected_dashboards: list[str] = []  # Placeholder for future


class ColumnFlow(BaseModel):
    source_column: str
    target_column: str
    transformation_type: str  # "direct", "rename", "derived", "aggregate"
    node_id: str
    pipeline_id: int


class ColumnLineage(BaseModel):
    column_name: str
    asset_id: int
    origin_asset_id: int
    origin_column_name: str
    path: list[ColumnFlow]


class ColumnImpact(BaseModel):
    column_name: str
    asset_id: int
    asset_name: str
    pipeline_id: int
    pipeline_name: str
    node_id: str
    transformation_type: str


class ColumnImpactAnalysis(BaseModel):
    column_name: str
    asset_id: int
    impacts: list[ColumnImpact]
