from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import models
from app.api import deps
from synqx_core.models.user import User
from synqx_core.models.enums import JobType, JobStatus
from synqx_core.models.ephemeral import EphemeralJob
from synqx_core.models.explorer import QueryHistory
from synqx_core.schemas.ephemeral import EphemeralJobResponse
from app.services.ephemeral_service import EphemeralJobService
from app.services import connection_service
from app.services.vault_service import VaultService
from synqx_engine.connectors.factory import ConnectorFactory
from app.utils.agent import is_remote_group
from app.core.logging import get_logger
from app.core.errors import AppError

router = APIRouter()
logger = get_logger(__name__)

class QueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 100
    offset: Optional[int] = 0
    params: Optional[Dict[str, Any]] = None
    agent_group: Optional[str] = None # Support manual override

class HistoryItem(BaseModel):
    id: int
    query: str
    status: str
    execution_time_ms: int
    row_count: Optional[int]
    created_at: datetime
    connection_name: str
    created_by: Optional[str]

    class Config:
        from_attributes = True

@router.post("/{connection_id}/execute", response_model=EphemeralJobResponse)
def execute_connection_query(
    connection_id: int,
    request: QueryRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    """
    Execute a raw query against a connection using the unified service.
    Handles both direct sync execution and async job queuing.
    """
    service = connection_service.ConnectionService(db)
    
    try:
        # Delegate all logic to the Service Layer
        result = service.execute_query_unified(
            connection_id=connection_id,
            query=request.query,
            workspace_id=current_user.active_workspace_id,
            user_id=current_user.id,
            limit=request.limit,
            offset=request.offset,
            params=request.params,
            agent_group=request.agent_group
        )

        # BRANCH A: Service created a background job (Remote Agent)
        if result.get("type") == "job":
            # The job was already created by the service, we just need to return it
            job = db.query(EphemeralJob).get(result["job_id"])
            return job

        # BRANCH B: Service executed synchronously (Internal Agent)
        # Construct a response object that matches the EphemeralJob schema
        return EphemeralJobResponse(
            id=result.get("history_id", 0),
            job_type=JobType.EXPLORER,
            connection_id=connection_id,
            workspace_id=current_user.active_workspace_id,
            user_id=current_user.id,
            status=JobStatus.SUCCESS,
            payload=request.model_dump(),
            agent_group=result.get("agent_group", "internal"),
            started_at=datetime.now(timezone.utc), # Approx
            completed_at=datetime.now(timezone.utc),
            execution_time_ms=result.get("execution_time_ms", 0),
            result_summary=result.get("summary"),
            result_sample={"rows": result.get("results", [])},
            error_message=None,
            worker_id=result.get("worker_id"),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
    except AppError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Explorer API Fault: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during query execution")

@router.get("/jobs/{job_id}", response_model=EphemeralJobResponse)
def get_ephemeral_job(
    job_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Poll for result of an ephemeral job."""
    job = db.query(EphemeralJob).filter(
        EphemeralJob.id == job_id,
        EphemeralJob.workspace_id == current_user.active_workspace_id
    ).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.get("/activity", response_model=List[EphemeralJobResponse])
def list_ephemeral_activity(
    job_type: Optional[JobType] = None,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """List recent interactive activity."""
    return EphemeralJobService.list_jobs(
        db, 
        workspace_id=current_user.active_workspace_id, 
        job_type=job_type, 
        limit=limit
    )

@router.get("/history", response_model=List[HistoryItem])
def get_query_history(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    """
    Get execution history. Merges legacy QueryHistory and new EphemeralJob records.
    """
    # 1. Fetch Legacy History
    legacy_history = db.query(QueryHistory, models.Connection.name.label("connection_name"))\
        .join(models.Connection, QueryHistory.connection_id == models.Connection.id)\
        .filter(QueryHistory.workspace_id == current_user.active_workspace_id)\
        .all()
    
    # 2. Fetch New Ephemeral History (Explorer type only)
    new_history = db.query(EphemeralJob)\
        .filter(
            EphemeralJob.workspace_id == current_user.active_workspace_id,
            EphemeralJob.job_type == JobType.EXPLORER
        ).all()
    
    results = []
    
    # Process Legacy
    for item, connection_name in legacy_history:
        history_data = item.__dict__.copy()
        history_data["connection_name"] = connection_name
        results.append(HistoryItem.model_validate(history_data))
        
    # Process New
    for job in new_history:
        results.append(HistoryItem(
            id=job.id,
            query=job.payload.get("query", "Unknown Query"),
            status=job.status.value,
            execution_time_ms=job.execution_time_ms or 0,
            row_count=job.result_summary.get("count") if job.result_summary else 0,
            created_at=job.created_at,
            connection_name=job.connection.name if job.connection else "Unknown",
            created_by=job.user.email if job.user else "System"
        ))
        
    # Sort merged results by timestamp and apply pagination
    results.sort(key=lambda x: x.created_at, reverse=True)
    return results[offset : offset + limit]

@router.delete("/history")
def clear_query_history(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
):
    """
    Clear execution history for the active workspace.
    """
    db.query(QueryHistory).filter(QueryHistory.workspace_id == current_user.active_workspace_id).delete()
    # Also clear ephemeral explorer jobs
    db.query(EphemeralJob).filter(
        EphemeralJob.workspace_id == current_user.active_workspace_id,
        EphemeralJob.job_type == JobType.EXPLORER
    ).delete()
    db.commit()
    return {"status": "success"}

@router.delete("/activity")
def clear_ephemeral_activity(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
):
    """Clear all activity history (all types)."""
    db.query(EphemeralJob).filter(EphemeralJob.workspace_id == current_user.active_workspace_id).delete()
    db.commit()
    return {"status": "success"}

@router.get("/{connection_id}/schema-metadata")
def get_connection_schema_metadata(
    connection_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    """
    Get full schema metadata for autocompletion.
    """
    service = connection_service.ConnectionService(db)
    connection = service.get_connection(
        connection_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # --- AGENT ROUTING ---
    agent_group = connection.workspace.default_agent_group if connection.workspace else "internal"
    
    if is_remote_group(agent_group):
        # For remote, return metadata from assets
        metadata = {}
        for asset in connection.assets:
            if asset.schema_metadata:
                metadata[asset.name] = [col["name"] for col in asset.schema_metadata.get("columns", [])]
            else:
                metadata[asset.name] = []
        return {
            "connector_type": connection.connector_type,
            "metadata": metadata,
            "source": "cache"
        }

    try:
        config = VaultService.get_connector_config(connection)
        
        # Inject Execution Context for Custom Script
        if connection.connector_type.value == "custom_script":
            from app.services.dependency_service import DependencyService
            dep_service = DependencyService(db, connection.id, user_id=current_user.id)
            exec_ctx = {}
            exec_ctx.update(dep_service.get_execution_context("python"))
            exec_ctx.update(dep_service.get_execution_context("node"))
            config["execution_context"] = exec_ctx

        connector = ConnectorFactory.get_connector(
            connector_type=connection.connector_type.value,
            config=config
        )
        
        assets = connector.discover_assets(include_metadata=False)
        
        # For each asset, get columns for rich autocompletion
        metadata = {}
        for asset in assets:
            asset_name = asset["name"]
            try:
                schema = connector.infer_schema(asset_name)
                metadata[asset_name] = [col["name"] for col in schema.get("columns", [])]
            except Exception:
                metadata[asset_name] = []
                
        return {
            "connector_type": connection.connector_type,
            "metadata": metadata,
            "source": "live"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))