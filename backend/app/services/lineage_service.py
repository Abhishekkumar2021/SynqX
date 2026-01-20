from sqlalchemy import case, func
from sqlalchemy.orm import Session
from synqx_core.models.connections import Asset
from synqx_core.models.enums import PipelineRunStatus, PipelineStatus
from synqx_core.models.execution import PipelineRun, StepRun
from synqx_core.models.pipelines import Pipeline, PipelineNode, PipelineVersion
from synqx_core.schemas.lineage import (
    ColumnFlow,
    ColumnImpact,
    ColumnImpactAnalysis,
    ColumnLineage,
    ImpactAnalysis,
    LineageEdge,
    LineageGraph,
    LineageNode,
)


class LineageService:
    def __init__(self, db: Session):
        self.db = db

    def get_global_lineage(self, workspace_id: int) -> LineageGraph:  # noqa: PLR0912
        """
        Builds a global lineage graph with rich metrics.
        """
        nodes: dict[str, LineageNode] = {}
        edges: list[LineageEdge] = []

        # 1. Fetch Pipelines & Stats
        pipelines = (
            self.db.query(Pipeline)
            .filter(
                Pipeline.workspace_id == workspace_id,
                Pipeline.status != PipelineStatus.ARCHIVED,
            )
            .all()
        )

        asset_ids: set[int] = set()

        # Pre-fetch stats for all pipelines to avoid N+1 queries
        # We want: total_runs, success_rate, avg_duration, last_run_at
        pipeline_stats = {}

        stats_query = (
            self.db.query(
                PipelineRun.pipeline_id,
                func.count(PipelineRun.id).label("total"),
                func.avg(PipelineRun.duration_seconds).label("avg_dur"),
                func.max(PipelineRun.created_at).label("last_run"),
                func.sum(
                    case(
                        (PipelineRun.status == PipelineRunStatus.COMPLETED, 1), else_=0
                    )
                ).label("successes"),
            )
            .group_by(PipelineRun.pipeline_id)
            .all()
        )

        for p_id, total, avg_dur, last_run, successes in stats_query:
            pipeline_stats[p_id] = {
                "total_runs": total,
                "avg_duration": float(avg_dur) if avg_dur else 0,
                "last_run_at": last_run.isoformat() if last_run else None,
                "success_rate": int((successes / total) * 100) if total > 0 else 0,
            }

        for pipeline in pipelines:
            # Get effective version
            version_id = pipeline.published_version_id
            if not version_id:
                latest = (
                    self.db.query(PipelineVersion)
                    .filter(PipelineVersion.pipeline_id == pipeline.id)
                    .order_by(PipelineVersion.version.desc())
                    .first()
                )
                if latest:
                    version_id = latest.id

            if not version_id:
                continue

            p_nodes = (
                self.db.query(PipelineNode)
                .filter(PipelineNode.pipeline_version_id == version_id)
                .all()
            )

            inputs = {n.source_asset_id for n in p_nodes if n.source_asset_id}
            outputs = {
                n.destination_asset_id for n in p_nodes if n.destination_asset_id
            }

            asset_ids.update(inputs)
            asset_ids.update(outputs)

            p_stats = pipeline_stats.get(pipeline.id, {})

            for source_id in inputs:
                for dest_id in outputs:
                    if source_id == dest_id:
                        continue

                    edge_id = f"p{pipeline.id}_s{source_id}_t{dest_id}"
                    edges.append(
                        LineageEdge(
                            id=edge_id,
                            source=f"asset_{source_id}",
                            target=f"asset_{dest_id}",
                            label=pipeline.name,
                            data={
                                "pipeline_id": pipeline.id,
                                "pipeline_name": pipeline.name,
                                "status": pipeline.status.value,
                                "stats": p_stats,
                            },
                        )
                    )

        # 2. Fetch Asset Details & Health
        assets = self.db.query(Asset).filter(Asset.id.in_(asset_ids)).all()

        # Aggregate health metrics (latest run per producing node)
        health_stats = {}
        latest_step_runs = (
            self.db.query(StepRun.node_id, func.max(StepRun.id).label("max_id"))
            .group_by(StepRun.node_id)
            .subquery()
        )

        step_stats_query = (
            self.db.query(
                StepRun.records_out,
                StepRun.records_error,
                StepRun.status,
                PipelineNode.destination_asset_id,
            )
            .join(latest_step_runs, StepRun.id == latest_step_runs.c.max_id)
            .join(PipelineNode, StepRun.node_id == PipelineNode.id)
            .filter(PipelineNode.destination_asset_id.in_(asset_ids))
            .all()
        )

        for rec_out, rec_err, status, asset_id in step_stats_query:
            v = float(rec_out or 0)
            e = float(rec_err or 0)
            score = (v / (v + e) * 100) if (v + e) > 0 else 100.0

            # Penalize heavily if the last run failed
            if status == "failed":
                score = score * 0.2
            elif status != "success":  # pending, running, etc.
                score = score * 0.8

            health_stats[asset_id] = {
                "health_score": round(score, 1),
                "last_run_status": status,
            }

        for asset in assets:
            conn_type = "generic"
            if asset.connection:
                conn_type = asset.connection.connector_type.value

            a_health = health_stats.get(
                asset.id, {"health_score": 100.0, "last_run_status": "unknown"}
            )

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
                    "last_updated": asset.updated_at.isoformat()
                    if asset.updated_at
                    else None,
                    "health_score": a_health["health_score"],
                    "last_run_status": a_health["last_run_status"],
                },
            )

        # 3. Calculate Global Stats
        stats = {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "orphaned_assets": 0,
        }

        return LineageGraph(nodes=list(nodes.values()), edges=edges, stats=stats)

    def get_column_lineage(
        self, asset_id: int, column_name: str, workspace_id: int
    ) -> ColumnLineage:
        """
        Trace a specific column back to its origin using automated run-level lineage.
        """
        path: list[ColumnFlow] = []
        current_asset_id = asset_id
        current_column = column_name

        # Recursive trace back
        while True:
            # Find the node that produces this asset as a destination
            producing_node = (
                self.db.query(PipelineNode)
                .join(
                    PipelineVersion,
                    PipelineNode.pipeline_version_id == PipelineVersion.id,
                )
                .join(Pipeline, PipelineVersion.pipeline_id == Pipeline.id)
                .filter(
                    PipelineNode.destination_asset_id == current_asset_id,
                    Pipeline.workspace_id == workspace_id,
                )
                .first()
            )

            if not producing_node:
                # We've reached a source asset
                return ColumnLineage(
                    column_name=column_name,
                    asset_id=asset_id,
                    origin_asset_id=current_asset_id,
                    origin_column_name=current_column,
                    path=path,
                )

            # --- HIGH FIDELITY TRACING ---
            # Try to find the most recent successful run for this node
            last_run = (
                self.db.query(StepRun)
                .filter(
                    StepRun.node_id == producing_node.id,
                    StepRun.status == "success",
                    StepRun.lineage_map.isnot(None),
                )
                .order_by(StepRun.completed_at.desc())
                .first()
            )

            source_col = current_column
            transform_type = "direct"

            if last_run and last_run.lineage_map:
                # Use actual execution results
                # Map is Output -> List[Input]
                upstream_cols = last_run.lineage_map.get(current_column, [])
                if upstream_cols:
                    # For now, we take the first ancestor.
                    # Complex multi-source lineage (like calculated fields) would list all.  # noqa: E501
                    # Standardizing on dot-notation parsing for multi-source
                    raw_source = upstream_cols[0]
                    if "." in raw_source:
                        source_col = raw_source.split(".", 1)[1]
                    else:
                        source_col = raw_source
                    transform_type = "automated"

            # Fallback to static analysis if no run-level data
            elif (
                producing_node.column_mapping
                and current_column in producing_node.column_mapping
            ):
                source_col = producing_node.column_mapping[current_column]
                transform_type = "mapped"

            elif producing_node.operator_class == "rename_columns":
                mapping = producing_node.config.get("columns", {})
                reverse_mapping = {v: k for k, v in mapping.items()}
                if current_column in reverse_mapping:
                    source_col = reverse_mapping[current_column]
                    transform_type = "rename"

            # Add to path
            path.insert(
                0,
                ColumnFlow(
                    source_column=source_col,
                    target_column=current_column,
                    transformation_type=transform_type,
                    node_id=producing_node.node_id,
                    pipeline_id=producing_node.version.pipeline_id,
                ),
            )

            # Move upstream
            current_asset_id = producing_node.source_asset_id
            current_column = source_col

            if not current_asset_id:
                break

        return ColumnLineage(
            column_name=column_name,
            asset_id=asset_id,
            origin_asset_id=current_asset_id or 0,
            origin_column_name=current_column,
            path=path,
        )

    def get_column_impact_analysis(  # noqa: PLR0912
        self, asset_id: int, column_name: str, workspace_id: int
    ) -> ColumnImpactAnalysis:
        """
        Trace downstream dependencies for a specific column.
        Answers: "If I change/delete this column, what breaks?"
        """
        impacts: list[ColumnImpact] = []
        visited = set()  # (asset_id, column_name)

        queue = [(asset_id, column_name)]

        while queue:
            curr_asset_id, curr_column = queue.pop(0)
            if (curr_asset_id, curr_column) in visited:
                continue
            visited.add((curr_asset_id, curr_column))

            # Find nodes that consume this asset
            consuming_nodes = (
                self.db.query(PipelineNode)
                .join(
                    PipelineVersion,
                    PipelineNode.pipeline_version_id == PipelineVersion.id,
                )
                .join(Pipeline, PipelineVersion.pipeline_id == Pipeline.id)
                .filter(
                    PipelineNode.source_asset_id == curr_asset_id,
                    Pipeline.workspace_id == workspace_id,
                )
                .all()
            )

            for node in consuming_nodes:
                # Find the most recent successful run to get lineage_map
                last_run = (
                    self.db.query(StepRun)
                    .filter(
                        StepRun.node_id == node.id,
                        StepRun.status == "success",
                        StepRun.lineage_map.isnot(None),
                    )
                    .order_by(StepRun.completed_at.desc())
                    .first()
                )

                derived_columns = []

                if last_run and last_run.lineage_map:
                    # lineage_map is Output -> List[Input]
                    for output_col, input_cols in last_run.lineage_map.items():
                        # Input cols might be like "asset_name.column_name" or just "column_name"  # noqa: E501
                        for in_col in input_cols:
                            if in_col == curr_column or in_col.endswith(
                                f".{curr_column}"
                            ):
                                derived_columns.append((output_col, "automated"))
                                break

                # Fallback to static mapping if no automated lineage found for this column  # noqa: E501
                if not derived_columns:
                    if node.column_mapping:
                        # mapping is Target -> Source
                        for target, source in node.column_mapping.items():
                            if source == curr_column:
                                derived_columns.append((target, "mapped"))

                    elif node.operator_class == "rename_columns":
                        mapping = node.config.get("columns", {})
                        if curr_column in mapping:
                            derived_columns.append((mapping[curr_column], "rename"))

                    # Direct pass-through for some operators if not explicitly mapped
                    elif node.operator_class in ["filter", "sort", "limit"]:
                        derived_columns.append((curr_column, "passthrough"))

                # If we found derived columns, they affect the destination asset
                if derived_columns and node.destination_asset:
                    for der_col, trans_type in derived_columns:
                        impacts.append(
                            ColumnImpact(
                                column_name=der_col,
                                asset_id=node.destination_asset.id,
                                asset_name=node.destination_asset.name,
                                pipeline_id=node.version.pipeline_id,
                                pipeline_name=node.version.pipeline.name,
                                node_id=node.node_id,
                                transformation_type=trans_type,
                            )
                        )
                        queue.append((node.destination_asset.id, der_col))

        return ColumnImpactAnalysis(
            column_name=column_name, asset_id=asset_id, impacts=impacts
        )

    def get_impact_analysis(self, asset_id: int, workspace_id: int) -> ImpactAnalysis:
        """
        Trace downstream dependencies for a specific asset.
        """
        direct_pipelines = []
        downstream_assets = []

        consuming_nodes = (
            self.db.query(PipelineNode)
            .join(
                PipelineVersion, PipelineNode.pipeline_version_id == PipelineVersion.id
            )
            .join(Pipeline, PipelineVersion.pipeline_id == Pipeline.id)
            .filter(
                PipelineNode.source_asset_id == asset_id,
                Pipeline.workspace_id == workspace_id,
            )
            .all()
        )

        seen_pipelines = set()

        for node in consuming_nodes:
            pipeline = node.version.pipeline
            if pipeline.id in seen_pipelines:
                continue
            seen_pipelines.add(pipeline.id)

            direct_pipelines.append(
                {
                    "id": pipeline.id,
                    "name": pipeline.name,
                    "status": pipeline.status.value,
                }
            )

            output_nodes = (
                self.db.query(PipelineNode)
                .filter(
                    PipelineNode.pipeline_version_id == node.pipeline_version_id,
                    PipelineNode.destination_asset_id.isnot(None),
                )
                .all()
            )

            for out_node in output_nodes:
                if out_node.destination_asset:
                    downstream_assets.append(
                        {
                            "id": out_node.destination_asset.id,
                            "name": out_node.destination_asset.name,
                            "type": out_node.destination_asset.asset_type,
                            "schema_metadata": out_node.destination_asset.schema_metadata,  # noqa: E501
                        }
                    )

        return ImpactAnalysis(
            asset_id=asset_id,
            downstream_pipelines=direct_pipelines,
            downstream_assets=downstream_assets,
        )
