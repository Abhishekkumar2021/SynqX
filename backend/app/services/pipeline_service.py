import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from synqx_core.models.agent import Agent
from synqx_core.models.enums import (
    AgentStatus,
    JobStatus,
    OperatorType,
    PipelineStatus,
    RetryStrategy,
    SchemaEvolutionPolicy,
    WriteStrategy,
)
from synqx_core.models.execution import Job
from synqx_core.models.pipelines import (
    Pipeline,
    PipelineEdge,
    PipelineNode,
    PipelineVersion,
)
from synqx_core.schemas.pipeline import (
    PipelineCreate,
    PipelineEdgeCreate,
    PipelineNodeCreate,
    PipelineUpdate,
    PipelineVersionCreate,
)

from app.core.errors import AppError, ConfigurationError
from app.core.logging import get_logger
from app.engine.agent_engine import PipelineAgent as PipelineRunner
from app.utils.agent import is_remote_group
from app.worker.tasks import execute_pipeline_task

logger = get_logger(__name__)


class PipelineService:
    """
    Service layer for pipeline management operations.
    Handles pipeline creation, versioning, validation, and execution triggering.
    """

    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.pipeline_runner = PipelineRunner()

    def create_pipeline(
        self,
        pipeline_create: PipelineCreate,
        validate_dag: bool = True,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> Pipeline:
        """
        Creates a new pipeline along with its initial version, nodes, and edges.
        """
        try:
            # Validate pipeline configuration before creation
            if validate_dag:
                self._validate_pipeline_configuration(pipeline_create.initial_version)

            # Create the main Pipeline object
            db_pipeline = Pipeline(
                name=pipeline_create.name,
                description=pipeline_create.description,
                schedule_cron=pipeline_create.schedule_cron,
                schedule_enabled=pipeline_create.schedule_enabled or False,
                schedule_timezone=pipeline_create.schedule_timezone,
                max_parallel_runs=pipeline_create.max_parallel_runs or 1,
                max_retries=pipeline_create.max_retries or 3,
                retry_strategy=pipeline_create.retry_strategy or RetryStrategy.FIXED,
                retry_delay_seconds=pipeline_create.retry_delay_seconds or 60,
                execution_timeout_seconds=pipeline_create.execution_timeout_seconds,
                agent_group=pipeline_create.agent_group,
                tags=pipeline_create.tags,
                priority=pipeline_create.priority or 0,
                status=PipelineStatus.DRAFT,  # Start as draft
                user_id=user_id,
                workspace_id=workspace_id,
                created_by=str(user_id) if user_id else None,
            )
            self.db_session.add(db_pipeline)
            self.db_session.flush()

            # Create the initial PipelineVersion
            db_version = self._create_pipeline_version(
                db_pipeline.id,
                pipeline_create.initial_version,
                version_number=1,
                is_published=False,
            )
            self.db_session.add(db_version)
            self.db_session.flush()

            # Update pipeline with current version
            db_pipeline.current_version = db_version.version

            # Create Nodes for the version
            self._create_pipeline_nodes(
                db_version.id,
                pipeline_create.initial_version.nodes,
            )
            self.db_session.flush()  # Flush nodes before edges

            # Create Edges for the version
            self._create_pipeline_edges(
                db_version.id,
                pipeline_create.initial_version.edges,
            )

            self.db_session.commit()
            self.db_session.refresh(db_pipeline)

            logger.info(
                "Pipeline created successfully",
                extra={
                    "pipeline_id": db_pipeline.id,
                    "pipeline_name": db_pipeline.name,
                    "user_id": user_id,
                },
            )

            return db_pipeline

        except IntegrityError as e:
            self.db_session.rollback()
            logger.error(f"Integrity constraint violation creating pipeline: {e}")
            raise AppError(
                "Pipeline creation failed: duplicate name or invalid reference"
            ) from e

        except ConfigurationError as e:
            self.db_session.rollback()
            logger.error(f"Configuration error creating pipeline: {e}")
            raise

        except SQLAlchemyError as e:
            self.db_session.rollback()
            logger.error(f"Database error creating pipeline: {e}", exc_info=True)
            raise AppError("Failed to create pipeline due to database error") from e

        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Unexpected error creating pipeline: {e}", exc_info=True)
            raise AppError(f"Failed to create pipeline: {e}") from e

    def create_pipeline_version(
        self,
        pipeline_id: int,
        version_data: PipelineVersionCreate,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> PipelineVersion:
        """
        Creates a new version for an existing pipeline.
        """
        pipeline = self.get_pipeline(
            pipeline_id, user_id=user_id, workspace_id=workspace_id
        )
        if not pipeline:
            raise AppError(f"Pipeline {pipeline_id} not found")

        try:
            # Validate configuration
            self._validate_pipeline_configuration(version_data)

            # Determine next version number
            last_version = (
                self.db_session.query(PipelineVersion)
                .filter(PipelineVersion.pipeline_id == pipeline_id)
                .order_by(PipelineVersion.version.desc())
                .first()
            )
            next_version_num = (last_version.version + 1) if last_version else 1

            # Create Version
            db_version = self._create_pipeline_version(
                pipeline_id,
                version_data,
                version_number=next_version_num,
                is_published=False,
            )
            self.db_session.add(db_version)
            self.db_session.flush()

            # Create Nodes
            self._create_pipeline_nodes(
                db_version.id,
                version_data.nodes,
            )
            self.db_session.flush()

            # Create Edges
            self._create_pipeline_edges(
                db_version.id,
                version_data.edges,
            )

            self.db_session.commit()
            self.db_session.refresh(db_version)

            logger.info(
                f"Created version {next_version_num} for pipeline {pipeline_id}",
                extra={"pipeline_id": pipeline_id, "version": next_version_num},
            )

            return db_version

        except ConfigurationError:
            self.db_session.rollback()
            raise
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to create pipeline version: {e}", exc_info=True)
            raise AppError(f"Failed to create pipeline version: {e}") from e

    def update_pipeline(  # noqa: PLR0912
        self,
        pipeline_id: int,
        pipeline_update: PipelineUpdate,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> Pipeline:
        """
        Update pipeline metadata (not version/nodes/edges).
        """
        pipeline = self.get_pipeline(
            pipeline_id, user_id=user_id, workspace_id=workspace_id
        )
        if not pipeline:
            raise AppError(f"Pipeline {pipeline_id} not found")

        # Update fields
        if pipeline_update.name is not None:
            pipeline.name = pipeline_update.name
        if pipeline_update.description is not None:
            pipeline.description = pipeline_update.description
        if pipeline_update.schedule_cron is not None:
            pipeline.schedule_cron = pipeline_update.schedule_cron
        if pipeline_update.schedule_enabled is not None:
            pipeline.schedule_enabled = pipeline_update.schedule_enabled
        if pipeline_update.schedule_timezone is not None:
            pipeline.schedule_timezone = pipeline_update.schedule_timezone
        if pipeline_update.status is not None:
            pipeline.status = pipeline_update.status
        if pipeline_update.max_parallel_runs is not None:
            pipeline.max_parallel_runs = pipeline_update.max_parallel_runs
        if pipeline_update.max_retries is not None:
            pipeline.max_retries = pipeline_update.max_retries
        if pipeline_update.retry_strategy is not None:
            pipeline.retry_strategy = pipeline_update.retry_strategy
        if pipeline_update.retry_delay_seconds is not None:
            pipeline.retry_delay_seconds = pipeline_update.retry_delay_seconds
        if pipeline_update.execution_timeout_seconds is not None:
            pipeline.execution_timeout_seconds = (
                pipeline_update.execution_timeout_seconds
            )
        if pipeline_update.priority is not None:
            pipeline.priority = pipeline_update.priority

        # agent_group can be explicitly set to None to revert to Internal worker
        if pipeline_update.agent_group is not None:
            pipeline.agent_group = pipeline_update.agent_group
        elif (
            "agent_group" in pipeline_update.model_fields_set
            and pipeline_update.agent_group is None
        ):
            pipeline.agent_group = "internal"

        if pipeline_update.tags is not None:
            pipeline.tags = pipeline_update.tags

        pipeline.updated_at = datetime.now(UTC)
        if user_id:
            pipeline.updated_by = str(user_id)

        try:
            self.db_session.commit()
            logger.info(f"Pipeline {pipeline_id} updated successfully")
            return pipeline
        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to update pipeline {pipeline_id}: {e}")
            raise AppError(f"Failed to update pipeline: {e}") from e

    def publish_version(
        self,
        pipeline_id: int,
        version_id: int,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> PipelineVersion:
        """
        Publish a specific pipeline version, making it the active version.
        Unpublishes any previously published version.
        """
        pipeline = self.get_pipeline(
            pipeline_id, user_id=user_id, workspace_id=workspace_id
        )
        if not pipeline:
            raise AppError(f"Pipeline {pipeline_id} not found")

        version = (
            self.db_session.query(PipelineVersion)
            .filter(
                and_(
                    PipelineVersion.id == version_id,
                    PipelineVersion.pipeline_id == pipeline_id,
                )
            )
            .first()
        )

        if not version:
            raise AppError(f"Version {version_id} not found for pipeline {pipeline_id}")

        try:
            # Unpublish current published version
            if pipeline.published_version_id:
                current_published = (
                    self.db_session.query(PipelineVersion)
                    .filter(PipelineVersion.id == pipeline.published_version_id)
                    .first()
                )
                if current_published:
                    current_published.is_published = False

            # Publish new version
            version.is_published = True
            version.published_at = datetime.now(UTC)
            pipeline.published_version_id = version.id
            pipeline.status = PipelineStatus.ACTIVE

            self.db_session.commit()

            logger.info(
                f"Published version {version.version} for pipeline {pipeline_id}",
                extra={"pipeline_id": pipeline_id, "version_id": version_id},
            )

            return version

        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to publish version: {e}")
            raise AppError(f"Failed to publish version: {e}") from e

    def get_pipeline(
        self,
        pipeline_id: int,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> Pipeline | None:
        """Retrieves a pipeline by its ID, scoped by user or workspace."""
        query = self.db_session.query(Pipeline).filter(
            and_(
                Pipeline.id == pipeline_id,
                Pipeline.deleted_at.is_(None),
            )
        )
        if workspace_id is not None:
            query = query.filter(Pipeline.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Pipeline.user_id == user_id)
        return query.first()

    def list_pipelines(
        self,
        status: PipelineStatus | None = None,
        limit: int = 100,
        offset: int = 0,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> tuple[list[Pipeline], int]:
        """List pipelines scoped by user or workspace."""
        query = self.db_session.query(Pipeline).filter(Pipeline.deleted_at.is_(None))

        if workspace_id is not None:
            query = query.filter(Pipeline.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Pipeline.user_id == user_id)

        if status:
            query = query.filter(Pipeline.status == status)

        total = query.count()
        items = (
            query.order_by(Pipeline.created_at.desc()).limit(limit).offset(offset).all()
        )

        return items, total

    def get_pipeline_version(
        self,
        pipeline_id: int,
        version_id: int | None = None,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> PipelineVersion | None:
        """
        Retrieves a specific pipeline version or the currently published one.
        """
        query = (
            self.db_session.query(PipelineVersion)
            .join(Pipeline, PipelineVersion.pipeline_id == Pipeline.id)
            .filter(
                and_(
                    Pipeline.id == pipeline_id,
                    Pipeline.deleted_at.is_(None),
                )
            )
        )
        if workspace_id is not None:
            query = query.filter(Pipeline.workspace_id == workspace_id)
        elif user_id is not None:
            query = query.filter(Pipeline.user_id == user_id)

        if version_id:
            query = query.filter(PipelineVersion.id == version_id)
        else:
            query = query.filter(PipelineVersion.is_published)

        return query.first()

    def trigger_pipeline_run(  # noqa: PLR0912, PLR0913, PLR0915
        self,
        pipeline_id: int,
        version_id: int | None = None,
        async_execution: bool = True,
        run_params: dict[str, Any] | None = None,
        user_id: int | None = None,
        workspace_id: int | None = None,
        is_backfill: bool = False,
        backfill_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Fixed trigger with proper field names."""
        pipeline = self.get_pipeline(
            pipeline_id, user_id=user_id, workspace_id=workspace_id
        )
        if not pipeline:
            raise AppError(f"Pipeline {pipeline_id} not found")

        if pipeline.max_parallel_runs:
            now = datetime.now(UTC)
            stale_threshold = now - timedelta(hours=2)

            active_jobs_count = (
                self.db_session.query(Job)
                .filter(
                    and_(
                        Job.pipeline_id == pipeline_id,
                        Job.status.in_([JobStatus.PENDING, JobStatus.RUNNING]),
                        Job.created_at > stale_threshold,
                    )
                )
                .count()
            )

            if active_jobs_count >= pipeline.max_parallel_runs:
                raise AppError(
                    f"Pipeline has reached max parallel runs limit ({pipeline.max_parallel_runs}). "  # noqa: E501
                    f"Currently {active_jobs_count} jobs running."
                )

        pipeline_version = self.get_pipeline_version(
            pipeline_id, version_id, user_id=user_id, workspace_id=workspace_id
        )
        if not pipeline_version:
            raise AppError(
                f"Pipeline version not found for pipeline {pipeline_id}, version {version_id}"  # noqa: E501
            )

        job = Job(
            pipeline_id=pipeline_id,
            pipeline_version_id=pipeline_version.id,
            user_id=user_id or pipeline.user_id,
            workspace_id=workspace_id or pipeline.workspace_id,
            correlation_id=str(uuid.uuid4()),
            status=JobStatus.PENDING,
            is_backfill=is_backfill,
            backfill_config=backfill_config or {},
            created_by=str(user_id) if user_id else None,
        )
        self.db_session.add(job)
        self.db_session.flush()

        try:
            # Check for Remote Agent Routing & Global Load Balancing
            target_group = pipeline.agent_group
            if is_remote_group(target_group) or target_group == "auto":
                from app.services.agent_service import AgentService  # noqa: PLC0415

                selected_agent = None
                if target_group == "auto":
                    # Global Load Balancing: Find the best agent across all groups in workspace  # noqa: E501
                    # Or we could have a specific 'global' group.
                    # For now, 'auto' means 'find least busy online agent in workspace'
                    online_agents = (
                        self.db_session.query(Agent)
                        .filter(
                            Agent.workspace_id
                            == (workspace_id or pipeline.workspace_id),
                            Agent.status == AgentStatus.ONLINE,
                        )
                        .all()
                    )

                    if online_agents:
                        # Simple load balancer if no group specified
                        selected_agent = AgentService.find_best_agent(
                            self.db_session,
                            workspace_id or pipeline.workspace_id,
                            online_agents[0].tags.get("groups", ["default"])[0],
                        )
                else:
                    # Group-specific load balancing
                    selected_agent = AgentService.find_best_agent(
                        self.db_session,
                        workspace_id or pipeline.workspace_id,
                        target_group,
                    )

                if not selected_agent:
                    if target_group == "auto":
                        raise AppError(
                            "No active agents found in workspace for automatic dispatch."  # noqa: E501
                        )
                    raise AppError(
                        f"No active agents found in group '{target_group}'. Please ensure your remote agent is running."  # noqa: E501
                    )

                # Mark as queued for specific agent or group
                job.status = JobStatus.QUEUED
                job.queue_name = target_group
                job.worker_id = selected_agent.client_id
                self.db_session.commit()

                logger.info(
                    f"Pipeline #{pipeline_id} run queued for agent '{selected_agent.name}' (Group: {target_group})",  # noqa: E501
                    extra={
                        "pipeline_id": pipeline_id,
                        "job_id": job.id,
                        "agent_id": selected_agent.id,
                        "agent_group": target_group,
                    },
                )

                return {
                    "status": "queued",
                    "message": f"Job successfully dispatched to agent '{selected_agent.name}'.",  # noqa: E501
                    "job_id": job.id,
                    "pipeline_id": pipeline_id,
                    "version_id": pipeline_version.id,
                    "queue": target_group,
                    "agent_name": selected_agent.name,
                }

            if async_execution:
                task = execute_pipeline_task.delay(job.id)
                job.celery_task_id = task.id
                self.db_session.commit()

                logger.info(
                    f"Pipeline #{pipeline_id} run enqueued for background processing (Job #{job.id})",  # noqa: E501
                    extra={
                        "pipeline_id": pipeline_id,
                        "job_id": job.id,
                        "task_id": task.id,
                    },
                )

                return {
                    "status": "enqueued",
                    "message": "Pipeline run successfully enqueued for background execution.",  # noqa: E501
                    "job_id": job.id,
                    "task_id": task.id,
                    "pipeline_id": pipeline_id,
                    "version_id": pipeline_version.id,
                }
            else:
                job.status = JobStatus.RUNNING
                job.started_at = datetime.now(UTC)
                self.db_session.commit()

                self.pipeline_runner.run(
                    pipeline_version, db=self.db_session, job_id=job.id
                )

                job.status = JobStatus.SUCCESS
                job.completed_at = datetime.now(UTC)
                if job.started_at and job.completed_at:
                    # Ensure datetimes are timezone-aware before subtraction
                    started_at_aware = (
                        job.started_at.replace(tzinfo=UTC)
                        if job.started_at.tzinfo is None
                        else job.started_at
                    )
                    completed_at_aware = (
                        job.completed_at.replace(tzinfo=UTC)
                        if job.completed_at.tzinfo is None
                        else job.completed_at
                    )
                    duration_ms = int(
                        (completed_at_aware - started_at_aware).total_seconds() * 1000
                    )
                    job.execution_time_ms = duration_ms
                self.db_session.commit()

                logger.info(
                    f"Pipeline #{pipeline_id} run completed synchronously in {job.execution_time_ms}ms (Job #{job.id})",  # noqa: E501
                    extra={"pipeline_id": pipeline_id, "job_id": job.id},
                )

                return {
                    "status": "success",
                    "message": "Pipeline run completed successfully",
                    "job_id": job.id,
                    "pipeline_id": pipeline_id,
                    "version_id": pipeline_version.id,
                }

        except Exception as e:
            logger.error(
                "Failed to trigger pipeline run",
                extra={"pipeline_id": pipeline_id, "job_id": job.id, "error": str(e)},
                exc_info=True,
            )

            self.db_session.rollback()

            failed_job = self.db_session.query(Job).filter(Job.id == job.id).first()
            if (
                failed_job and failed_job.started_at and failed_job.completed_at
            ):  # Add check for completed_at too
                failed_job.status = JobStatus.FAILED
                failed_job.completed_at = datetime.now(UTC)
                failed_job.infra_error = str(e)
                # Ensure datetimes are timezone-aware before subtraction
                started_at_aware = (
                    failed_job.started_at.replace(tzinfo=UTC)
                    if failed_job.started_at.tzinfo is None
                    else failed_job.started_at
                )
                completed_at_aware = (
                    failed_job.completed_at.replace(tzinfo=UTC)
                    if failed_job.completed_at.tzinfo is None
                    else failed_job.completed_at
                )
                duration_ms = int(
                    (completed_at_aware - started_at_aware).total_seconds() * 1000
                )
                failed_job.execution_time_ms = duration_ms
                self.db_session.commit()

            raise AppError(f"Failed to trigger pipeline run: {e}") from e

    def delete_pipeline(
        self,
        pipeline_id: int,
        hard_delete: bool = False,
        user_id: int | None = None,
        workspace_id: int | None = None,
    ) -> bool:
        """
        Delete a pipeline (soft delete by default).
        """
        pipeline = self.get_pipeline(
            pipeline_id, user_id=user_id, workspace_id=workspace_id
        )
        if not pipeline:
            raise AppError(f"Pipeline {pipeline_id} not found")

        try:
            if hard_delete:
                self.db_session.delete(pipeline)
            else:
                pipeline.deleted_at = datetime.now(UTC)
                pipeline.status = PipelineStatus.ARCHIVED
                if user_id:
                    pipeline.deleted_by = str(user_id)

            self.db_session.commit()

            logger.info(
                f"Pipeline {'hard' if hard_delete else 'soft'} deleted",
                extra={"pipeline_id": pipeline_id},
            )

            return True

        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to delete pipeline: {e}")
            raise AppError(f"Failed to delete pipeline: {e}") from e

    def _validate_pipeline_configuration(
        self, version_data: PipelineVersionCreate
    ) -> None:
        """
        Validate pipeline configuration before creation.
        Checks for DAG validity, operator compatibility, etc.
        """
        if not version_data.nodes:
            raise ConfigurationError("Pipeline must have at least one node")

        # Check for duplicate node IDs
        node_ids = [node.node_id for node in version_data.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ConfigurationError("Duplicate node IDs found in pipeline")

        # Validate edges reference existing nodes
        valid_node_ids = set(node_ids)
        for edge in version_data.edges:
            if edge.from_node_id not in valid_node_ids:
                raise ConfigurationError(
                    f"Edge references non-existent from_node: {edge.from_node_id}"
                )
            if edge.to_node_id not in valid_node_ids:
                raise ConfigurationError(
                    f"Edge references non-existent to_node: {edge.to_node_id}"
                )
            if edge.from_node_id == edge.to_node_id:
                raise ConfigurationError(f"Self-loop detected: {edge.from_node_id}")

        # Build adjacency map for validation
        node_map = {node.node_id: node for node in version_data.nodes}
        upstream_map = {node_id: [] for node_id in node_ids}

        for edge in version_data.edges:
            upstream_map[edge.to_node_id].append(edge.from_node_id)

        # Validate multi-input operators and required assets
        for node_id, upstream_nodes in upstream_map.items():
            node = node_map[node_id]

            # 1. Multi-input validation
            if len(upstream_nodes) > 1:
                if node.operator_type not in [
                    OperatorType.MERGE,
                    OperatorType.UNION,
                    OperatorType.JOIN,
                ]:
                    raise ConfigurationError(
                        f"Node '{node_id}' has {len(upstream_nodes)} inputs but "
                        f"operator type '{node.operator_type.value}' only supports single input"  # noqa: E501
                    )

            # 2. Required asset validation for Source/Sink
            if node.operator_type == OperatorType.EXTRACT and not node.source_asset_id:
                raise ConfigurationError(
                    f"Source node '{node_id}' must have a source asset defined."
                )
            if (
                node.operator_type == OperatorType.LOAD
                and not node.destination_asset_id
            ):
                raise ConfigurationError(
                    f"Sink node '{node_id}' must have a destination asset defined."
                )

    def _create_pipeline_version(
        self,
        pipeline_id: int,
        version_data: PipelineVersionCreate,
        version_number: int,
        is_published: bool,
    ) -> PipelineVersion:
        """Helper to create a PipelineVersion object."""
        return PipelineVersion(
            pipeline_id=pipeline_id,
            version=version_number,
            config_snapshot=version_data.config_snapshot,
            change_summary=version_data.change_summary,
            version_notes=version_data.version_notes,
            is_published=is_published,
            published_at=datetime.now(UTC) if is_published else None,
        )

    def _create_pipeline_nodes(
        self,
        pipeline_version_id: int,
        nodes_data: list[PipelineNodeCreate],
    ) -> None:
        """Helper to create PipelineNode objects."""
        for node_data in nodes_data:
            db_node = PipelineNode(
                pipeline_version_id=pipeline_version_id,
                node_id=node_data.node_id,
                name=node_data.name,
                description=node_data.description,
                operator_type=node_data.operator_type,
                operator_class=node_data.operator_class,
                config=node_data.config or {},
                sync_mode=node_data.sync_mode,
                # Fix: Handle cdc_config correctly (ensure it's a dict)
                cdc_config=node_data.cdc_config
                if isinstance(node_data.cdc_config, dict)
                else {},
                order_index=node_data.order_index,
                source_asset_id=node_data.source_asset_id,
                destination_asset_id=node_data.destination_asset_id,
                # New: Map missing fields from schema/request to model
                write_strategy=getattr(
                    node_data, "write_strategy", WriteStrategy.APPEND
                ),
                schema_evolution_policy=getattr(
                    node_data, "schema_evolution_policy", SchemaEvolutionPolicy.STRICT
                ),
                guardrails=getattr(node_data, "guardrails", []),
                data_contract=getattr(node_data, "data_contract", {}),
                column_mapping=getattr(node_data, "column_mapping", {}),
                quarantine_asset_id=getattr(node_data, "quarantine_asset_id", None),
                # Advanced Orchestration
                sub_pipeline_id=getattr(node_data, "sub_pipeline_id", None),
                is_dynamic=getattr(node_data, "is_dynamic", False),
                mapping_expr=getattr(node_data, "mapping_expr", None),
                worker_tag=getattr(node_data, "worker_tag", None),
                # Retry logic
                max_retries=node_data.max_retries or 0,
                retry_strategy=node_data.retry_strategy or RetryStrategy.FIXED,
                retry_delay_seconds=node_data.retry_delay_seconds or 60,
                timeout_seconds=node_data.timeout_seconds,
            )
            self.db_session.add(db_node)

    def _create_pipeline_edges(
        self,
        pipeline_version_id: int,
        edges_data: list[PipelineEdgeCreate],
    ) -> None:
        """Helper to create PipelineEdge objects."""
        for edge_data in edges_data:
            db_edge = PipelineEdge(
                pipeline_version_id=pipeline_version_id,
                from_node_id=self._get_node_db_id(
                    pipeline_version_id, edge_data.from_node_id
                ),
                to_node_id=self._get_node_db_id(
                    pipeline_version_id, edge_data.to_node_id
                ),
                edge_type=edge_data.edge_type,
            )
            self.db_session.add(db_edge)

    def _get_node_db_id(self, pipeline_version_id: int, node_code_id: str) -> int:
        """
        Helper to get the database ID of a node given its pipeline_version_id and node_id.
        """  # noqa: E501
        node = (
            self.db_session.query(PipelineNode)
            .filter(
                and_(
                    PipelineNode.pipeline_version_id == pipeline_version_id,
                    PipelineNode.node_id == node_code_id,
                )
            )
            .first()
        )

        if not node:
            raise ConfigurationError(
                f"Node with ID '{node_code_id}' not found for version {pipeline_version_id}. "  # noqa: E501
                "Ensure nodes are created before edges referencing them."
            )
        return node.id

    def get_pipeline_next_run(self, pipeline_id: int) -> datetime | None:
        """Get next scheduled run time for a pipeline."""
        from app.engine.scheduler import Scheduler  # noqa: PLC0415

        scheduler = Scheduler(self.db_session)
        return scheduler.get_pipeline_next_run(pipeline_id)
