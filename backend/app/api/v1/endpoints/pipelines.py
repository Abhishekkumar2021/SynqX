from typing import Optional, List
import json
import yaml
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, File, UploadFile, Response
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineRead,
    PipelineUpdate,
    PipelineDetailRead,
    PipelineListResponse,
    PipelineVersionCreate,
    PipelineVersionRead,
    PipelineVersionSummary,
    PipelineTriggerRequest,
    PipelineTriggerResponse,
    PipelinePublishRequest,
    PipelinePublishResponse,
    PipelineValidationResponse,
    PipelineStatsResponse,
    PipelineDiffResponse,
)
from app.services.pipeline_service import PipelineService
from app.services.gitops_service import GitOpsService
from app.services.audit_service import AuditService
from app.core.errors import AppError, ConfigurationError
from app.core.logging import get_logger
from app.models.enums import PipelineStatus

router = APIRouter()
logger = get_logger(__name__)


@router.post(
    "",
    response_model=PipelineDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Pipeline",
    description="Creates a new pipeline with its initial version, nodes, and edges",
)
def create_pipeline(
    pipeline_create: PipelineCreate,
    validate_dag: bool = Query(
        True, description="Validate DAG structure before creation"
    ),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = PipelineService(db)
        pipeline = service.create_pipeline(
            pipeline_create, 
            validate_dag=validate_dag, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="pipeline.create",
            target_type="Pipeline",
            target_id=pipeline.id,
            details={"name": pipeline.name}
        )

        response = PipelineDetailRead.model_validate(pipeline)

        if pipeline.published_version_id:
            version_detail = service.get_pipeline_version(
                pipeline.id, pipeline.published_version_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id
            )
            if version_detail:
                response.published_version = PipelineVersionRead.model_validate(
                    version_detail
                )

        return response

    except ConfigurationError as e:
        logger.error(f"Configuration error creating pipeline: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "Configuration error", "message": str(e)},
        )
    except AppError as e:
        logger.error(f"Error creating pipeline: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error creating pipeline: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred",
            },
        )


@router.post(
    "/import",
    response_model=PipelineRead,
    status_code=status.HTTP_201_CREATED,
    summary="Import Pipeline YAML",
    description="Create or update a pipeline from a YAML definition",
)
def import_pipeline(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        content = file.file.read()
        data = yaml.safe_load(content)
        pipeline = GitOpsService.import_pipeline_from_dict(
            db, data, current_user.active_workspace_id, current_user.id
        )
        
        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="pipeline.import",
            target_type="Pipeline",
            target_id=pipeline.id,
            details={"name": pipeline.name}
        )
        
        return PipelineRead.model_validate(pipeline)
    except Exception as e:
        logger.error(f"Failed to import YAML: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Import failed", "message": str(e)},
        )


@router.get(
    "",
    response_model=PipelineListResponse,
    summary="List Pipelines",
    description="List all pipelines with optional filtering",
)
def list_pipelines(
    status_filter: Optional[PipelineStatus] = Query(
        None, description="Filter by pipeline status"
    ),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        service = PipelineService(db)
        pipelines, total = service.list_pipelines(
            status=status_filter, 
            limit=limit, 
            offset=offset, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        return PipelineListResponse(
            pipelines=[PipelineRead.model_validate(p) for p in pipelines],
            total=total,
            limit=limit,
            offset=offset,
        )

    except Exception as e:
        logger.error(f"Error listing pipelines: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to list pipelines",
            },
        )


@router.get(
    "/{pipeline_id}",
    response_model=PipelineDetailRead,
    summary="Get Pipeline",
    description="Retrieve a pipeline by ID with its published version details",
)
def get_pipeline(
    pipeline_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    service = PipelineService(db)
    pipeline = service.get_pipeline(pipeline_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id)

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Not found",
                "message": f"Pipeline {pipeline_id} not found",
            },
        )

    response = PipelineDetailRead.model_validate(pipeline)

    if pipeline.published_version_id:
        version_detail = service.get_pipeline_version(
            pipeline.id, pipeline.published_version_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id
        )
        if version_detail:
            response.published_version = PipelineVersionRead.model_validate(
                version_detail
            )

    # Fetch latest version (even if not published) for editing
    if pipeline.versions:
        # Relationship is ordered by version desc in the model
        latest_v = pipeline.versions[0]
        latest_detail = service.get_pipeline_version(
            pipeline.id, latest_v.id, user_id=current_user.id, workspace_id=current_user.active_workspace_id
        )
        if latest_detail:
            response.latest_version = PipelineVersionRead.model_validate(latest_detail)

    if pipeline.versions:
        response.versions = [
            PipelineVersionSummary(
                id=v.id,
                version=v.version,
                is_published=v.is_published,
                published_at=v.published_at,
                node_count=len(v.nodes) if v.nodes else 0,
                edge_count=len(v.edges) if v.edges else 0,
                created_at=v.created_at,
            )
            for v in pipeline.versions[:10]
        ]

    return response


@router.get(
    "/{pipeline_id}/export",
    summary="Export Pipeline YAML",
    description="Export a pipeline definition as a YAML file",
)
def export_pipeline(
    pipeline_id: int,
    version_id: Optional[int] = Query(None, description="Specific version to export"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    service = PipelineService(db)
    pipeline = service.get_pipeline(pipeline_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id)
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
        
    try:
        yaml_content = GitOpsService.export_pipeline_to_yaml(db, pipeline_id, version_id)
        filename = f"synqx_{pipeline.name.lower().replace(' ', '_')}.yaml"
        
        return Response(
            content=yaml_content,
            media_type="application/x-yaml",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail="Export failed")


@router.patch(
    "/{pipeline_id}",
    response_model=PipelineRead,
    summary="Update Pipeline",
    description="Update pipeline metadata (not version/nodes/edges)",
)
def update_pipeline(
    pipeline_id: int,
    pipeline_update: PipelineUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = PipelineService(db)
        pipeline = service.update_pipeline(
            pipeline_id, 
            pipeline_update, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="pipeline.update",
            target_type="Pipeline",
            target_id=pipeline.id,
            details={"updated_fields": pipeline_update.model_dump(exclude_unset=True)}
        )

        return PipelineRead.model_validate(pipeline)

    except AppError as e:
        logger.error(f"Error updating pipeline {pipeline_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(
            f"Unexpected error updating pipeline {pipeline_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to update pipeline",
            },
        )


@router.delete(
    "/{pipeline_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Pipeline",
    description="Soft delete a pipeline (marks as deleted, doesn't remove from database)",
)
def delete_pipeline(
    pipeline_id: int,
    hard_delete: bool = Query(False, description="Permanently delete from database"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
) -> None:
    try:
        service = PipelineService(db)
        # Fetch name before deletion for audit trail
        pipeline = service.get_pipeline(pipeline_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id)
        pipeline_name = pipeline.name if pipeline else "Unknown"

        service.delete_pipeline(
            pipeline_id, 
            hard_delete=hard_delete, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="pipeline.delete",
            target_type="Pipeline",
            target_id=pipeline_id,
            details={"name": pipeline_name, "hard_delete": hard_delete}
        )

        return None

    except AppError as e:
        logger.error(f"Error deleting pipeline {pipeline_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(
            f"Unexpected error deleting pipeline {pipeline_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to delete pipeline",
            },
        )


@router.post(
    "/{pipeline_id}/trigger",
    response_model=PipelineTriggerResponse,
    summary="Trigger Pipeline Run",
    description="Trigger an immediate execution of the pipeline",
)
def trigger_pipeline_run(
    pipeline_id: int,
    trigger_request: PipelineTriggerRequest = Body(...),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = PipelineService(db)
        result = service.trigger_pipeline_run(
            pipeline_id=pipeline_id,
            version_id=trigger_request.version_id,
            async_execution=trigger_request.async_execution,
            run_params=trigger_request.run_params,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="pipeline.trigger",
            target_type="Pipeline",
            target_id=pipeline_id,
            details={"job_id": result["job_id"], "version_id": trigger_request.version_id}
        )

        return PipelineTriggerResponse(
            status=result["status"],
            message=result["message"],
            job_id=result["job_id"],
            task_id=result.get("task_id"),
            pipeline_id=pipeline_id,
            version_id=trigger_request.version_id or 0,
        )

    except AppError as e:
        logger.error(f"Error triggering pipeline {pipeline_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(
            f"Unexpected error triggering pipeline {pipeline_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to trigger pipeline run",
            },
        )


@router.post(
    "/{pipeline_id}/versions",
    response_model=PipelineVersionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Pipeline Version",
    description="Create a new version of the pipeline with updated nodes and edges",
)
def create_pipeline_version(
    pipeline_id: int,
    version_create: PipelineVersionCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = PipelineService(db)
        version = service.create_pipeline_version(
            pipeline_id, 
            version_create, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return PipelineVersionRead.model_validate(version)

    except ConfigurationError as e:
        logger.error(f"Configuration error creating version: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "Configuration error", "message": str(e)},
        )
    except AppError as e:
        logger.error(f"Error creating version for pipeline {pipeline_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error creating version: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to create pipeline version",
            },
        )


@router.get(
    "/{pipeline_id}/versions",
    response_model=List[PipelineVersionSummary],
    summary="List Pipeline Versions",
    description="Get all versions of a pipeline",
)
def list_pipeline_versions(
    pipeline_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    service = PipelineService(db)
    pipeline = service.get_pipeline(pipeline_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id)

    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Not found",
                "message": f"Pipeline {pipeline_id} not found",
            },
        )

    if not pipeline.versions:
        return []

    return [
        PipelineVersionSummary(
            id=v.id,
            version=v.version,
            is_published=v.is_published,
            published_at=v.published_at,
            node_count=len(v.nodes) if v.nodes else 0,
            edge_count=len(v.edges) if v.edges else 0,
            created_at=v.created_at,
        )
        for v in pipeline.versions
    ]


@router.get(
    "/{pipeline_id}/versions/{version_id}",
    response_model=PipelineVersionRead,
    summary="Get Pipeline Version",
    description="Get detailed information about a specific pipeline version",
)
def get_pipeline_version(
    pipeline_id: int,
    version_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    service = PipelineService(db)
    version = service.get_pipeline_version(
        pipeline_id, 
        version_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )

    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Not found",
                "message": f"Version {version_id} not found for pipeline {pipeline_id}",
            },
        )

    return PipelineVersionRead.model_validate(version)


@router.post(
    "/{pipeline_id}/versions/{version_id}/publish",
    response_model=PipelinePublishResponse,
    summary="Publish Pipeline Version",
    description="Publish a specific version, making it the active version for execution",
)
def publish_pipeline_version(
    pipeline_id: int,
    version_id: int,
    publish_request: PipelinePublishRequest = Body(...),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = PipelineService(db)
        version = service.publish_version(
            pipeline_id, 
            version_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="pipeline.publish",
            target_type="Pipeline",
            target_id=pipeline_id,
            details={"version_id": version_id, "version_number": version.version}
        )

        return PipelinePublishResponse(
            message=f"Version {version.version} published successfully",
            version_id=version.id,
            version_number=version.version,
            published_at=version.published_at,
        )

    except AppError as e:
        logger.error(
            f"Error publishing version {version_id} for pipeline {pipeline_id}: {e}"
        )
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error publishing version: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to publish version",
            },
        )


@router.post(
    "/{pipeline_id}/validate",
    response_model=PipelineValidationResponse,
    summary="Validate Pipeline Configuration",
    description="Validate pipeline DAG structure and configuration without creating it",
)
def validate_pipeline(
    pipeline_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        service = PipelineService(db)
        pipeline = service.get_pipeline(
            pipeline_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not pipeline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Not found",
                    "message": f"Pipeline {pipeline_id} not found",
                },
            )

        version = service.get_pipeline_version(
            pipeline_id, 
            None, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not version:
            return PipelineValidationResponse(
                valid=False,
                errors=[
                    {
                        "field": "version",
                        "message": "No published version found",
                        "error_type": "MissingVersion",
                    }
                ],
            )

        try:
            service._validate_pipeline_configuration(version)
            return PipelineValidationResponse(valid=True, errors=[], warnings=[])
        except ConfigurationError as e:
            return PipelineValidationResponse(
                valid=False,
                errors=[
                    {
                        "field": "configuration",
                        "message": str(e),
                        "error_type": "ConfigurationError",
                    }
                ],
            )

    except Exception as e:
        logger.error(f"Error validating pipeline {pipeline_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to validate pipeline",
            },
        )


@router.get(
    "/{pipeline_id}/stats",
    response_model=PipelineStatsResponse,
    summary="Get Pipeline Statistics",
    description="Get execution statistics for a pipeline",
)
def get_pipeline_stats(
    pipeline_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        from sqlalchemy import func
        from app.models.execution import Job
        from app.models.enums import JobStatus

        service = PipelineService(db)
        pipeline = service.get_pipeline(
            pipeline_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not pipeline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Not found",
                    "message": f"Pipeline {pipeline_id} not found",
                },
            )

        # Assuming jobs are not strictly user-scoped beyond pipeline scope, 
        # but we found the pipeline via user_id, so it is safe.
        total_runs = (
            db.query(func.count(Job.id)).filter(Job.pipeline_id == pipeline_id).scalar()
            or 0
        )

        successful_runs = (
            db.query(func.count(Job.id))
            .filter(Job.pipeline_id == pipeline_id, Job.status == JobStatus.SUCCESS)
            .scalar()
            or 0
        )

        failed_runs = (
            db.query(func.count(Job.id))
            .filter(Job.pipeline_id == pipeline_id, Job.status == JobStatus.FAILED)
            .scalar()
            or 0
        )

        # Calculate total quarantined rows across all runs
        from app.models.execution import PipelineRun
        total_quarantined = (
            db.query(func.coalesce(func.sum(PipelineRun.total_failed), 0))
            .filter(PipelineRun.pipeline_id == pipeline_id)
            .scalar()
            or 0
        )

        # Calculate total records processed
        total_records = (
            db.query(func.coalesce(func.sum(PipelineRun.total_loaded), 0))
            .filter(PipelineRun.pipeline_id == pipeline_id)
            .scalar()
            or 0
        )

        # Calculate average duration with fallback for historical data
        # Using PostgreSQL specific EXTRACT(EPOCH FROM ...)
        avg_duration_query = db.query(
            func.avg(
                func.coalesce(
                    Job.execution_time_ms,
                    func.extract('epoch', Job.completed_at - Job.started_at) * 1000
                )
            )
        ).filter(
            Job.pipeline_id == pipeline_id,
            Job.status == JobStatus.SUCCESS,
            Job.completed_at.isnot(None),
            Job.started_at.isnot(None),
        )
        
        avg_duration_ms = avg_duration_query.scalar()
        avg_duration_seconds = (float(avg_duration_ms) / 1000.0) if avg_duration_ms is not None else None

        last_run = (
            db.query(Job.completed_at)
            .filter(Job.pipeline_id == pipeline_id, Job.completed_at.isnot(None))
            .order_by(Job.completed_at.desc())
            .first()
        )

        next_scheduled_run = None
        if pipeline.schedule_enabled and pipeline.schedule_cron:
            next_scheduled_run = service.get_pipeline_next_run(pipeline_id)

        return PipelineStatsResponse(
            pipeline_id=pipeline_id,
            total_runs=total_runs,
            successful_runs=successful_runs,
            failed_runs=failed_runs,
            total_quarantined=int(total_quarantined),
            total_records_processed=int(total_records),
            average_duration_seconds=avg_duration_seconds,
            last_run_at=last_run[0] if last_run else None,
            next_scheduled_run=next_scheduled_run,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting stats for pipeline {pipeline_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to get pipeline statistics",
            },
        )


@router.get(
    "/{pipeline_id}/diff",
    response_model=PipelineDiffResponse,
    summary="Diff Two Pipeline Versions",
    description="Compare two versions of a pipeline and return structural and config differences"
)
def get_pipeline_diff(
    pipeline_id: int,
    base_v: int = Query(..., description="Base version ID"),
    target_v: int = Query(..., description="Target version ID"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        from deepdiff import DeepDiff
        service = PipelineService(db)
        
        v1 = service.get_pipeline_version(
            pipeline_id, 
            base_v, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        v2 = service.get_pipeline_version(
            pipeline_id, 
            target_v, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        
        if not v1 or not v2:
            raise HTTPException(status_code=404, detail="One or both versions not found")
            
        # Diff Nodes
        v1_nodes = {n.node_id: n for n in v1.nodes}
        v2_nodes = {n.node_id: n for n in v2.nodes}
        
        added_nodes = [nid for nid in v2_nodes if nid not in v1_nodes]
        removed_nodes = [nid for nid in v1_nodes if nid not in v2_nodes]
        modified_nodes = []
        
        for nid in v1_nodes:
            if nid in v2_nodes:
                n1, n2 = v1_nodes[nid], v2_nodes[nid]
                
                # Ensure configs are dicts
                c1 = n1.config if isinstance(n1.config, dict) else {}
                c2 = n2.config if isinstance(n2.config, dict) else {}

                # Create a copy for comparison that ignores UI position noise
                comp_c1 = {k: v for k, v in c1.items() if k != 'ui'}
                comp_c2 = {k: v for k, v in c2.items() if k != 'ui'}

                # Compare critical attributes and config
                ddiff = DeepDiff(comp_c1, comp_c2, ignore_order=True)
                config_diff_raw = json.loads(ddiff.to_json()) if ddiff else {}
                
                name_changed = n1.name != n2.name
                type_changed = n1.operator_type != n2.operator_type
                
                if (name_changed or type_changed or config_diff_raw):
                    changes = {}
                    if name_changed: 
                        changes["name"] = {"from": n1.name, "to": n2.name}
                    if type_changed: 
                        changes["operator_type"] = {"from": n1.operator_type, "to": n2.operator_type}
                    if config_diff_raw: 
                        changes["config"] = config_diff_raw
                    
                    modified_nodes.append({
                        "node_id": nid,
                        "changes": changes
                    })

        # Diff Edges using logical node_id strings
        v1_edges = {f"{e.from_node.node_id}->{e.to_node.node_id}" for e in v1.edges if e.from_node and e.to_node}
        v2_edges = {f"{e.from_node.node_id}->{e.to_node.node_id}" for e in v2.edges if e.from_node and e.to_node}
        
        added_edges = list(v2_edges - v1_edges)
        removed_edges = list(v1_edges - v2_edges)
        
        return {
            "base_version": v1.version,
            "target_version": v2.version,
            "nodes": {
                "added": added_nodes,
                "removed": removed_nodes,
                "modified": modified_nodes
            },
            "edges": {
                "added": added_edges,
                "removed": removed_edges
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error diffing versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/{pipeline_id}/watermarks/{asset_id}",
    summary="Get Watermark State",
    description="Get the current incremental sync state for a specific asset in this pipeline"
)
def get_pipeline_watermark(
    pipeline_id: int,
    asset_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        from app.models.execution import Watermark
        # Verify pipeline access
        service = PipelineService(db)
        pipeline = service.get_pipeline(
            pipeline_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        if not pipeline:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        wm = db.query(Watermark).filter(
            Watermark.pipeline_id == pipeline_id,
            Watermark.asset_id == asset_id
        ).first()

        if not wm:
            return {"last_value": None, "last_updated": None}

        return {
            "last_value": wm.last_value,
            "last_updated": wm.last_updated,
            "watermark_column": wm.watermark_column
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting watermark: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
