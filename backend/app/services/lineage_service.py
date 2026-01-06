from typing import List, Dict, Set
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.pipelines import Pipeline, PipelineVersion, PipelineNode
from app.models.connections import Asset
from app.models.execution import PipelineRun
from app.models.enums import PipelineStatus, PipelineRunStatus
from app.schemas.lineage import LineageGraph, LineageNode, LineageEdge, ImpactAnalysis

class LineageService:
    def __init__(self, db: Session):
        self.db = db

    def get_global_lineage(self, workspace_id: int) -> LineageGraph:
        """
        Builds a global lineage graph with rich metrics.
        """
        nodes: Dict[str, LineageNode] = {}
        edges: List[LineageEdge] = []
        
        # 1. Fetch Pipelines & Stats
        pipelines = self.db.query(Pipeline).filter(
            Pipeline.workspace_id == workspace_id,
            Pipeline.status != PipelineStatus.ARCHIVED
        ).all()
        
        asset_ids: Set[int] = set()
        
        # Pre-fetch stats for all pipelines to avoid N+1 queries
        # We want: total_runs, success_rate, avg_duration, last_run_at
        pipeline_stats = {}
        
        stats_query = self.db.query(
            PipelineRun.pipeline_id,
            func.count(PipelineRun.id).label("total"),
            func.avg(PipelineRun.duration_seconds).label("avg_dur"),
            func.max(PipelineRun.created_at).label("last_run"),
            func.sum(case((PipelineRun.status == PipelineRunStatus.COMPLETED, 1), else_=0)).label("successes")
        ).group_by(PipelineRun.pipeline_id).all()
        
        for p_id, total, avg_dur, last_run, successes in stats_query:
            pipeline_stats[p_id] = {
                "total_runs": total,
                "avg_duration": float(avg_dur) if avg_dur else 0,
                "last_run_at": last_run.isoformat() if last_run else None,
                "success_rate": int((successes / total) * 100) if total > 0 else 0
            }

        for pipeline in pipelines:
            # Get effective version
            version_id = pipeline.published_version_id
            if not version_id:
                latest = self.db.query(PipelineVersion).filter(
                    PipelineVersion.pipeline_id == pipeline.id
                ).order_by(PipelineVersion.version.desc()).first()
                if latest:
                    version_id = latest.id
            
            if not version_id:
                continue
                
            p_nodes = self.db.query(PipelineNode).filter(
                PipelineNode.pipeline_version_id == version_id
            ).all()
            
            inputs = [n.source_asset_id for n in p_nodes if n.source_asset_id]
            outputs = [n.destination_asset_id for n in p_nodes if n.destination_asset_id]
            
            asset_ids.update(inputs)
            asset_ids.update(outputs)
            
            p_stats = pipeline_stats.get(pipeline.id, {})
            
            for source_id in inputs:
                for dest_id in outputs:
                    if source_id == dest_id:
                        continue
                        
                    edge_id = f"p{pipeline.id}_s{source_id}_t{dest_id}"
                    edges.append(LineageEdge(
                        id=edge_id,
                        source=f"asset_{source_id}",
                        target=f"asset_{dest_id}",
                        label=pipeline.name,
                        data={
                            "pipeline_id": pipeline.id,
                            "pipeline_name": pipeline.name,
                            "status": pipeline.status.value,
                            "stats": p_stats
                        }
                    ))
        
        # 2. Fetch Asset Details
        assets = self.db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        
        for asset in assets:
            conn_type = "generic"
            if asset.connection:
                conn_type = asset.connection.connector_type.value
                
            nodes[f"asset_{asset.id}"] = LineageNode(
                id=f"asset_{asset.id}",
                type="asset",
                label=asset.name,
                data={
                    "asset_id": asset.id,
                    "type": asset.asset_type,
                    "connection_type": conn_type,
                    "row_count": asset.row_count_estimate,
                    "size_bytes": asset.size_bytes_estimate,
                    "fqn": asset.fully_qualified_name,
                    "schema_version": asset.current_schema_version,
                    "last_updated": asset.updated_at.isoformat() if asset.updated_at else None
                }
            )

        # 3. Calculate Global Stats
        stats = {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "orphaned_assets": 0 
        }

        return LineageGraph(
            nodes=list(nodes.values()),
            edges=edges,
            stats=stats
        )

    def get_impact_analysis(self, asset_id: int, workspace_id: int) -> ImpactAnalysis:
        """
        Trace downstream dependencies for a specific asset.
        """
        direct_pipelines = []
        downstream_assets = []
        
        consuming_nodes = self.db.query(PipelineNode).join(
            PipelineVersion, PipelineNode.pipeline_version_id == PipelineVersion.id
        ).join(
            Pipeline, PipelineVersion.pipeline_id == Pipeline.id
        ).filter(
            PipelineNode.source_asset_id == asset_id,
            Pipeline.workspace_id == workspace_id
        ).all()
        
        seen_pipelines = set()
        
        for node in consuming_nodes:
            pipeline = node.version.pipeline
            if pipeline.id in seen_pipelines:
                continue
            seen_pipelines.add(pipeline.id)
            
            direct_pipelines.append({
                "id": pipeline.id,
                "name": pipeline.name,
                "status": pipeline.status.value
            })
            
            output_nodes = self.db.query(PipelineNode).filter(
                PipelineNode.pipeline_version_id == node.pipeline_version_id,
                PipelineNode.destination_asset_id.isnot(None)
            ).all()
            
            for out_node in output_nodes:
                if out_node.destination_asset:
                    downstream_assets.append({
                        "id": out_node.destination_asset.id,
                        "name": out_node.destination_asset.name,
                        "type": out_node.destination_asset.asset_type
                    })
                    
        return ImpactAnalysis(
            asset_id=asset_id,
            downstream_pipelines=direct_pipelines,
            downstream_assets=downstream_assets
        )