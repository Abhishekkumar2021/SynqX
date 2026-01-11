from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class LineageNode(BaseModel):
    id: str  # composite "asset_{id}" or "pipeline_{id}"
    type: str  # "asset", "pipeline", "transformation"
    label: str
    data: Dict[str, Any]  # Store asset_type, status, row_count, size_bytes, schema_version, last_updated, health_score
    
class LineageEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    data: Dict[str, Any] = {} # pipeline_id, run_status, avg_duration, success_rate, last_run_at

class LineageGraph(BaseModel):
    nodes: List[LineageNode]
    edges: List[LineageEdge]
    stats: Dict[str, Any]

class ImpactAnalysis(BaseModel):
    asset_id: int
    downstream_pipelines: List[Dict[str, Any]]
    downstream_assets: List[Dict[str, Any]]
    affected_dashboards: List[str] = [] # Placeholder for future

class ColumnFlow(BaseModel):
    source_column: str
    target_column: str
    transformation_type: str # "direct", "rename", "derived", "aggregate"
    node_id: str
    pipeline_id: int

class ColumnLineage(BaseModel):
    column_name: str
    asset_id: int
    origin_asset_id: int
    origin_column_name: str
    path: List[ColumnFlow]
