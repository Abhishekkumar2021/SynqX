from typing import Optional, List
from datetime import datetime
import os
import pyarrow.parquet as pq
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.schemas.job import (
    JobRead,
    JobListResponse,
    JobCancelRequest,
    JobRetryRequest,
    PipelineRunRead,
    PipelineRunDetailRead,
    PipelineRunListResponse,
    StepRunRead,
    StepLogRead,
    UnifiedLogRead,
)
from app.services.job_service import JobService, PipelineRunService
from app.api import deps
from app.core.errors import AppError
from app.core.logging import get_logger
from app.models.enums import JobStatus, PipelineRunStatus
from app import models

router = APIRouter()
logger = get_logger(__name__)


@router.get(
    "/jobs",
    response_model=JobListResponse,
    summary="List Jobs",
    description="List all jobs with optional filtering"
)
def list_jobs(
    pipeline_id: Optional[int] = Query(None, description="Filter by pipeline"),
    status: Optional[JobStatus] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = JobService(db)
        # Add workspace scoping
        jobs, total = service.list_jobs(
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            pipeline_id=pipeline_id,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return JobListResponse(
            jobs=[JobRead.model_validate(j) for j in jobs],
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error(f"Error listing jobs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to list jobs"}
        )


@router.get(
    "/jobs/{job_id}",
    response_model=JobRead,
    summary="Get Job",
    description="Get detailed information about a specific job"
)
def get_job(
    job_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    service = JobService(db)
    job = service.get_job(
        job_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "message": f"Job {job_id} not found"}
        )
    
    return JobRead.model_validate(job)


@router.get(
    "/jobs/{job_id}/run",
    response_model=PipelineRunDetailRead,
    summary="Get Pipeline Run by Job ID",
    description="Get the pipeline run associated with a specific job"
)
def get_job_run(
    job_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    service = PipelineRunService(db)
    # Find pipeline run by job_id
    from app.models.execution import PipelineRun, Job
    from app.schemas.pipeline import PipelineVersionRead
    
    # Check job ownership
    job_query = db.query(Job).filter(Job.id == job_id)
    if current_user.active_workspace_id:
        job_query = job_query.filter(Job.workspace_id == current_user.active_workspace_id)
    else:
        job_query = job_query.filter(Job.user_id == current_user.id)
    
    job = job_query.first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "message": f"Job {job_id} not found"}
        )

    run_query = db.query(PipelineRun).filter(PipelineRun.job_id == job_id)
    if current_user.active_workspace_id:
        run_query = run_query.filter(PipelineRun.workspace_id == current_user.active_workspace_id)
    else:
        run_query = run_query.filter(PipelineRun.user_id == current_user.id)
        
    run = run_query.first()
    
    if not run:
        # If no run record yet, return a synthetic one based on the Job to allow progress display
        
        # Calculate total nodes from the version
        total_nodes = 0
        version_data = None
        if job.version:
            total_nodes = len(job.version.nodes) if job.version.nodes else 0
            version_data = PipelineVersionRead.model_validate(job.version)

        # Create a synthetic response object
        return PipelineRunDetailRead(
            id=0,
            job_id=job_id,
            pipeline_id=job.pipeline_id,
            pipeline_version_id=job.pipeline_version_id,
            run_number=0,
            status=PipelineRunStatus.PENDING,
            total_nodes=total_nodes,
            total_extracted=0,
            total_loaded=0,
            total_failed=0,
            bytes_processed=0,
            error_message=None,
            failed_step_id=None,
            started_at=job.started_at,
            completed_at=None,
            duration_seconds=None,
            created_at=job.created_at,
            version=version_data,
            step_runs=[]
        )
    
    response = PipelineRunDetailRead.model_validate(run)
    # Ensure version is populated
    if run.version:
        response.version = PipelineVersionRead.model_validate(run.version)
    
    # Include step runs
    step_runs = service.get_run_steps(
        run.id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    response.step_runs = [StepRunRead.model_validate(s) for s in step_runs]
    
    return response


@router.post(
    "/jobs/{job_id}/cancel",
    response_model=JobRead,
    summary="Cancel Job",
    description="Cancel a running or pending job"
)
def cancel_job(
    job_id: int,
    cancel_request: JobCancelRequest = Body(default=JobCancelRequest()),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = JobService(db)
        job = service.cancel_job(
            job_id, 
            user_id=current_user.id, 
            workspace_id=current_user.active_workspace_id,
            reason=cancel_request.reason
        )
        return JobRead.model_validate(job)
        
    except AppError as e:
        logger.error(f"Error cancelling job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected error cancelling job {job_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to cancel job"}
        )


@router.post(
    "/jobs/{job_id}/retry",
    response_model=JobRead,
    summary="Retry Job",
    description="Retry a failed job"
)
def retry_job(
    job_id: int,
    retry_request: JobRetryRequest = Body(default=JobRetryRequest()),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = JobService(db)
        new_job = service.retry_job(
            job_id, 
            user_id=current_user.id, 
            workspace_id=current_user.active_workspace_id,
            force=retry_request.force
        )
        return JobRead.model_validate(new_job)
        
    except AppError as e:
        logger.error(f"Error retrying job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrying job {job_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to retry job"}
        )


@router.get(
    "/jobs/{job_id}/logs",
    response_model=List[UnifiedLogRead],
    summary="Get Job Logs",
    description="Get logs for a specific job"
)
def get_job_logs(
    job_id: int,
    level: Optional[str] = Query(None, description="Filter by log level"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = JobService(db)
        logs = service.get_job_logs(
            job_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            level=level
        )
        return [UnifiedLogRead.model_validate(log) for log in logs]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job logs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to get job logs"}
        )


@router.get(
    "/runs",
    response_model=PipelineRunListResponse,
    summary="List Pipeline Runs",
    description="List all pipeline runs with optional filtering"
)
def list_runs(
    pipeline_id: Optional[int] = Query(None, description="Filter by pipeline"),
    status: Optional[PipelineRunStatus] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = PipelineRunService(db)
        runs, total = service.list_runs(
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            pipeline_id=pipeline_id,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return PipelineRunListResponse(
            runs=[PipelineRunRead.model_validate(r) for r in runs],
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error(f"Error listing runs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to list runs"}
        )


@router.get(
    "/runs/{run_id}",
    response_model=PipelineRunDetailRead,
    summary="Get Pipeline Run",
    description="Get detailed information about a specific pipeline run including step runs"
)
def get_run(
    run_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    service = PipelineRunService(db)
    run = service.get_run(
        run_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "message": f"Pipeline run {run_id} not found"}
        )
    
    response = PipelineRunDetailRead.model_validate(run)
    
    step_runs = service.get_run_steps(
        run_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    response.step_runs = [StepRunRead.model_validate(s) for s in step_runs]
    
    return response


@router.get(
    "/runs/{run_id}/export",
    summary="Export Pipeline Run",
    description="Download complete pipeline run details including context and steps as JSON"
)
def export_run(
    run_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    from fastapi.responses import JSONResponse
    
    service = PipelineRunService(db)
    run = service.get_run(
        run_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    step_runs = service.get_run_steps(run_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id)
    
    # Build complete export bundle
    export_data = {
        "run_id": run.id,
        "pipeline_id": run.pipeline_id,
        "status": run.status.value,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "metrics": {
            "total_extracted": run.total_extracted,
            "total_loaded": run.total_loaded,
            "total_failed": run.total_failed,
            "bytes_processed": run.bytes_processed,
            "duration_seconds": run.duration_seconds
        },
        "context": {
            "parameters": run.context.parameters if run.context else {},
            "environment": run.context.environment if run.context else {},
            "runtime_metadata": run.context.context if run.context else {}
        },
        "steps": [
            {
                "id": s.id,
                "node_id": s.node_id,
                "operator_type": s.operator_type.value,
                "status": s.status.value,
                "metrics": {
                    "records_in": s.records_in,
                    "records_out": s.records_out,
                    "records_error": s.records_error
                }
            } for s in step_runs
        ]
    }
    
    filename = f"synqx_run_{run_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get(
    "/runs/{run_id}/steps",
    response_model=List[StepRunRead],
    summary="Get Step Runs",
    description="Get all step runs for a pipeline run"
)
def get_run_steps(
    run_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        service = PipelineRunService(db)
        steps = service.get_run_steps(
            run_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return [StepRunRead.model_validate(s) for s in steps]
        
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Error getting step runs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to get step runs"}
        )


@router.get(
    "/runs/{run_id}/steps/{step_id}/logs",
    response_model=List[StepLogRead],
    summary="Get Step Logs",
    description="Get logs for a specific step run"
)
def get_step_logs(
    run_id: int,
    step_id: int,
    level: Optional[str] = Query(None, description="Filter by log level"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        service = PipelineRunService(db)
        logs = service.get_step_logs(
            step_id, 
            user_id=current_user.id, 
            workspace_id=current_user.active_workspace_id,
            level=level
        )
        return [StepLogRead.model_validate(log) for log in logs]
        
    except Exception as e:
        logger.error(f"Error getting step logs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to get step logs"}
        )


@router.get(
    "/runs/{run_id}/steps/{step_id}/data",
    summary="Get Step Data Sample",
    description="Fetch a slice of data processed by this node during the run."
)
def get_step_data(
    run_id: int,
    step_id: int,
    direction: str = Query("out", pattern="^(in|out|quarantine)$"),
    limit: int = Query(10, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        from app.models.execution import StepRun, PipelineRun
        from app.engine.runner_core.forensics import ForensicSniffer
        
        # Ownership check
        query = db.query(StepRun).join(PipelineRun).filter(StepRun.id == step_id)
        if current_user.active_workspace_id:
            query = query.filter(PipelineRun.workspace_id == current_user.active_workspace_id)
        else:
            query = query.filter(PipelineRun.user_id == current_user.id)
            
        step = query.first()
        
        if not step:
            logger.error(f"Step run {step_id} not found or access denied")
            raise HTTPException(status_code=404, detail=f"Step run {step_id} not found")
        
        if step.pipeline_run_id != run_id:
            logger.error(f"Step run {step_id} does not belong to run {run_id}")
            raise HTTPException(status_code=400, detail="Step run / Run ID mismatch")
        
        # Use consistent absolute path logic for ForensicSniffer
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
        
        sniffer = ForensicSniffer(run_id)
        # Manually override base_dir to ensure consistency with project root
        sniffer.base_dir = os.path.join(project_root, "data", "forensics", f"run_{run_id}")
        
        # We use node.id (the integer from pipeline_nodes) which is stored in step.node_id
        logger.debug(f"Fetching forensic data for node {step.node_id}, run {run_id}, direction {direction}")
        data_slice = sniffer.fetch_slice(step.node_id, direction=direction, limit=limit, offset=offset)
        
        return {
            "step_id": step_id,
            "node_id": step.node_id,
            "direction": direction,
            "data": data_slice,
            "requested_limit": limit,
            "requested_offset": offset
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching step data for run {run_id}, step {step_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch forensic data: {str(e)}")


@router.delete(
    "/forensics/cache",
    summary="Clear Forensic Cache",
    description="Manually purge all cached forensic Parquet files."
)
def clear_forensic_cache(
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only superusers can clear forensic cache")
        
    try:
        from app.engine.runner_core.forensics import ForensicSniffer
        ForensicSniffer.cleanup_all()
        return {"status": "success", "message": "Forensic cache cleared"}
    except Exception as e:
        logger.error(f"Error clearing forensic cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear forensic cache")


@router.get(
    "/quarantine",
    summary="List Quarantined Data",
    description="List all steps that have quarantined data in the active workspace."
)
def list_quarantine(
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        from app.models.execution import StepRun, PipelineRun
        
        # Use consistent absolute path logic
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up 4 levels to reach backend root from app/api/v1/endpoints/
        project_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
        forensics_dir = os.path.join(project_root, "data", "forensics")
        
        if not os.path.exists(forensics_dir):
            return []
            
        quarantine_candidates = []
        # Scan disk for potential quarantine files
        for run_dir in os.listdir(forensics_dir):
            if not run_dir.startswith("run_"):
                continue
            
            run_id_str = run_dir.replace("run_", "")
            if not run_id_str.isdigit():
                continue
            run_id = int(run_id_str)
            
            run_path = os.path.join(forensics_dir, run_dir)
            if not os.path.isdir(run_path):
                continue

            for filename in os.listdir(run_path):
                if filename.endswith("_quarantine.parquet"):
                    try:
                        node_id = int(filename.split("_")[1])
                        quarantine_candidates.append((run_id, node_id, os.path.join(run_path, filename)))
                    except (IndexError, ValueError):
                        continue
        
        if not quarantine_candidates:
            return []
            
        # Sort by run_id desc to process recent ones first
        quarantine_candidates.sort(key=lambda x: x[0], reverse=True)
        
        results = []
        for run_id, node_id, file_path in quarantine_candidates:
            # Check if this run belongs to active workspace and get step details
            step = db.query(StepRun).join(PipelineRun).filter(
                PipelineRun.id == run_id,
                StepRun.node_id == node_id,
                PipelineRun.workspace_id == current_user.active_workspace_id
            ).first()
            
            if step:
                # Prioritize database records_error count for consistency with aggregate stats
                row_count = step.records_error
                
                # If database shows 0 but we found a file, try metadata as fallback
                if row_count == 0:
                    try:
                        # Efficient row count using metadata
                        metadata = pq.read_metadata(file_path)
                        row_count = metadata.num_rows
                    except Exception as e:
                        logger.warning(f"Failed to read metadata for {file_path}: {e}")
                        row_count = 0
                    
                results.append({
                    "step_id": step.id,
                    "run_id": run_id,
                    "pipeline_id": step.pipeline_run.pipeline_id,
                    "pipeline_name": step.pipeline_run.pipeline.name if step.pipeline_run.pipeline else "Unknown",
                    "node_id": node_id,
                    "node_name": step.node.name if step.node else f"Node {node_id}",
                    "created_at": step.created_at,
                    "row_count": row_count
                })
                
                # We collect a few extra to handle offset correctly in memory if needed, 
                # but results list is already filtered by workspace.
                if len(results) >= limit + offset:
                    break
                    
        return results[offset:offset+limit]
        
    except Exception as e:
        logger.error(f"Error listing quarantine: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get(
    "/pipelines/{pipeline_id}/metrics",
    summary="Get Pipeline Metrics",
    description="Get aggregated metrics for a pipeline's runs"
)
def get_pipeline_metrics(
    pipeline_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    try:
        service = PipelineRunService(db)
        metrics = service.get_run_metrics(
            pipeline_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return metrics
        
    except AppError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting pipeline metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": "Failed to get pipeline metrics"}
        )