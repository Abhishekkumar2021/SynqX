import yaml
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.pipelines import Pipeline, PipelineVersion
from app.models.connections import Connection
from app.schemas.pipeline import PipelineCreate, PipelineVersionCreate, PipelineNodeCreate, PipelineEdgeCreate
from app.core.errors import AppError

class GitOpsService:
    @staticmethod
    def export_pipeline_to_dict(db: Session, pipeline_id: int, version_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Serializes a pipeline and its nodes/edges into a portable dictionary format.
        Maps connection IDs to connection names for portability.
        """
        pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        if not pipeline:
            raise AppError("Pipeline not found")

        # Get specific version or active version or latest version
        if version_id:
            version = db.query(PipelineVersion).filter(PipelineVersion.id == version_id).first()
        elif pipeline.published_version_id:
            version = db.query(PipelineVersion).filter(PipelineVersion.id == pipeline.published_version_id).first()
        else:
            version = db.query(PipelineVersion).filter(PipelineVersion.pipeline_id == pipeline_id).order_by(PipelineVersion.version.desc()).first()

        if not version:
            raise AppError("Pipeline version not found")

        # Map connection IDs to Names for nodes
        nodes = []
        for node in version.nodes:
            conn_name = None
            if node.connection_id:
                conn = db.query(Connection).filter(Connection.id == node.connection_id).first()
                if conn:
                    conn_name = conn.name

            nodes.append({
                "id": node.node_id,
                "name": node.name,
                "description": node.description,
                "operator": node.operator_type.value,
                "class": node.operator_class,
                "config": node.config,
                "connection": conn_name,
                "max_retries": node.max_retries,
                "retry_strategy": node.retry_strategy.value,
                "timeout_seconds": node.timeout_seconds
            })

        edges = []
        for edge in version.edges:
            edges.append({
                "from": edge.from_node.node_id,
                "to": edge.to_node.node_id,
                "type": edge.edge_type
            })

        return {
            "version": "1.0",
            "metadata": {
                "name": pipeline.name,
                "description": pipeline.description,
                "agent_group": pipeline.agent_group,
                "tags": pipeline.tags,
                "priority": pipeline.priority
            },
            "schedule": {
                "cron": pipeline.schedule_cron,
                "enabled": pipeline.schedule_enabled,
                "timezone": pipeline.schedule_timezone
            },
            "settings": {
                "max_parallel_runs": pipeline.max_parallel_runs,
                "max_retries": pipeline.max_retries,
                "retry_strategy": pipeline.retry_strategy.value,
                "retry_delay_seconds": pipeline.retry_delay_seconds,
                "execution_timeout_seconds": pipeline.execution_timeout_seconds
            },
            "nodes": nodes,
            "edges": edges
        }

    @staticmethod
    def export_pipeline_to_yaml(db: Session, pipeline_id: int, version_id: Optional[int] = None) -> str:
        data = GitOpsService.export_pipeline_to_dict(db, pipeline_id, version_id)
        return yaml.dump(data, sort_keys=False, default_flow_style=False)

    @staticmethod
    def import_pipeline_from_dict(db: Session, data: Dict[str, Any], workspace_id: int, user_id: int) -> Pipeline:
        """
        Creates or updates a pipeline from a GitOps dictionary.
        Attempts to resolve connection names to IDs within the workspace.
        """
        from app.services.pipeline_service import PipelineService
        
        metadata = data.get("metadata", {})
        schedule = data.get("schedule", {})
        settings = data.get("settings", {})
        nodes_data = data.get("nodes", [])
        edges_data = data.get("edges", [])

        # Resolve Connections
        # Pre-fetch connections in workspace for resolution
        connections = db.query(Connection).filter(Connection.workspace_id == workspace_id).all()
        conn_map = {c.name: c.id for c in connections}

        # Build Pipeline Nodes
        nodes: List[PipelineNodeCreate] = []
        for i, n in enumerate(nodes_data):
            conn_id = None
            if n.get("connection"):
                conn_id = conn_map.get(n["connection"])
                if not conn_id:
                    # If not found by name, try parsing as ID if it looks like one
                    if str(n["connection"]).isdigit():
                        conn_id = int(n["connection"])
            
            nodes.append(PipelineNodeCreate(
                node_id=n["id"],
                name=n["name"],
                description=n.get("description"),
                operator_type=n["operator"],
                operator_class=n["class"],
                config=n.get("config", {}),
                order_index=i,
                connection_id=conn_id,
                max_retries=n.get("max_retries", 3),
                retry_strategy=n.get("retry_strategy", "fixed"),
                timeout_seconds=n.get("timeout_seconds")
            ))

        # Build Edges
        edges: List[PipelineEdgeCreate] = []
        for e in edges_data:
            edges.append(PipelineEdgeCreate(
                from_node_id=e["from"],
                to_node_id=e["to"],
                edge_type=e.get("type", "data_flow")
            ))

        version_create = PipelineVersionCreate(
            nodes=nodes,
            edges=edges,
            version_notes="Imported via GitOps"
        )

        pipeline_create = PipelineCreate(
            name=metadata["name"],
            description=metadata.get("description"),
            schedule_cron=schedule.get("cron"),
            schedule_enabled=schedule.get("enabled", False),
            schedule_timezone=schedule.get("timezone", "UTC"),
            max_parallel_runs=settings.get("max_parallel_runs", 1),
            max_retries=settings.get("max_retries", 3),
            retry_strategy=settings.get("retry_strategy", "fixed"),
            retry_delay_seconds=settings.get("retry_delay_seconds", 60),
            execution_timeout_seconds=settings.get("execution_timeout_seconds"),
            agent_group=metadata.get("agent_group", "internal"),
            tags=metadata.get("tags", {}),
            priority=metadata.get("priority", 5),
            initial_version=version_create
        )

        service = PipelineService(db)
        # Check if pipeline exists by name in workspace
        existing = db.query(Pipeline).filter(
            Pipeline.name == metadata["name"],
            Pipeline.workspace_id == workspace_id,
            Pipeline.deleted_at.is_(None)
        ).first()

        if existing:
            # Update existing pipeline with a new version
            service.create_pipeline_version(existing.id, version_create, user_id=user_id, workspace_id=workspace_id)
            # Update metadata
            service.update_pipeline(existing.id, pipeline_create, user_id=user_id, workspace_id=workspace_id)
            return existing
        else:
            return service.create_pipeline(pipeline_create, user_id=user_id, workspace_id=workspace_id)
