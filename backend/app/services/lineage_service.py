from typing import List, Dict, Set
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from synqx_core.models.pipelines import Pipeline, PipelineVersion, PipelineNode
from synqx_core.models.connections import Asset
from synqx_core.models.execution import PipelineRun
from synqx_core.models.enums import PipelineStatus, PipelineRunStatus
from synqx_core.schemas.lineage import LineageGraph, LineageNode, LineageEdge, ImpactAnalysis, ColumnLineage, ColumnFlow

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
            
            inputs = {n.source_asset_id for n in p_nodes if n.source_asset_id}
            outputs = {n.destination_asset_id for n in p_nodes if n.destination_asset_id}
            
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
                    "schema_metadata": asset.schema_metadata,
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

    def get_column_lineage(self, asset_id: int, column_name: str, workspace_id: int) -> ColumnLineage:
        """
        Trace a specific column back to its origin, supporting multi-source nodes.
        """
        path: List[ColumnFlow] = []
        current_asset_id = asset_id
        current_column = column_name
        
        # Recursive trace back
        while True:
            # Find the node that produces this asset as a destination
            producing_node = self.db.query(PipelineNode).join(
                PipelineVersion, PipelineNode.pipeline_version_id == PipelineVersion.id
            ).join(
                Pipeline, PipelineVersion.pipeline_id == Pipeline.id
            ).filter(
                PipelineNode.destination_asset_id == current_asset_id,
                Pipeline.workspace_id == workspace_id
            ).first()
            
            if not producing_node:
                # We've reached a source asset (no upstream pipeline produces it)
                return ColumnLineage(
                    column_name=column_name,
                    asset_id=asset_id,
                    origin_asset_id=current_asset_id,
                    origin_column_name=current_column,
                    path=path
                )
            
            # Analyze node transformation to find upstream column
            source_col = current_column
            transform_type = "direct"
            
            # 1. Check explicit column_mapping first (The New Standard)
            if producing_node.column_mapping:
                if current_column in producing_node.column_mapping:
                    source_col = producing_node.column_mapping[current_column]
                    transform_type = "mapped"
            
            # 2. Operator-specific heuristics for multi-source logic
            elif producing_node.operator_type == "join":
                # For joins, if no mapping, we assume the name matches in one of the inputs
                # This is a heuristic until strict contracts are enforced
                transform_type = "join_passthrough"
            
            elif producing_node.operator_class == "aggregate":
                # Aggregates often change names (e.g. sum_sales)
                # If no mapping, we check if the source col is part of the group_by or aggregate config
                agg_config = producing_node.config.get("aggregates", {})
                if current_column in agg_config:
                    # current_column IS the target, the source is the key inagg_config
                    # However agg_config is often {col: func}
                    source_col = current_column # name usually stays same in our engine unless aliased
                    transform_type = "aggregation"
            
            elif producing_node.operator_class == "rename_columns":
                mapping = producing_node.config.get("columns", {})
                reverse_mapping = {v: k for k, v in mapping.items()}
                if current_column in reverse_mapping:
                    source_col = reverse_mapping[current_column]
                    transform_type = "rename"
            
            # Add to path
            path.insert(0, ColumnFlow(
                source_column=source_col,
                target_column=current_column,
                transformation_type=transform_type,
                node_id=producing_node.node_id,
                pipeline_id=producing_node.version.pipeline_id
            ))
            
            # Move upstream: For multi-source, we need to pick the RIGHT source asset
            # If the node has multiple source assets (joins), we try to find which one has this column
            upstream_nodes = self.db.query(PipelineNode).filter(
                PipelineNode.pipeline_version_id == producing_node.pipeline_version_id,
                PipelineNode.destination_asset_id.isnot(None) # This logic needs refining for complex DAGs
            ).all()
            
            # For now, we take the primary source_asset_id
            current_asset_id = producing_node.source_asset_id
            current_column = source_col
            
            if not current_asset_id:
                break
                
        return ColumnLineage(
            column_name=column_name,
            asset_id=asset_id,
            origin_asset_id=current_asset_id or 0,
            origin_column_name=current_column,
            path=path)

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
                        "type": out_node.destination_asset.asset_type,
                        "schema_metadata": out_node.destination_asset.schema_metadata
                    })
                    
        return ImpactAnalysis(
            asset_id=asset_id,
            downstream_pipelines=direct_pipelines,
            downstream_assets=downstream_assets
        )