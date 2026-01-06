from typing import Any, Dict, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from app.services import connection_service
from app.services.vault_service import VaultService
from app.connectors.factory import ConnectorFactory
from app.models.ephemeral import EphemeralJob
from app.models.explorer import QueryHistory
from app.models.user import User
from app.models.enums import JobType
from pydantic import BaseModel

from app.services.ephemeral_service import EphemeralJobService
from app.schemas.ephemeral import EphemeralJobCreate, EphemeralJobResponse

router = APIRouter()

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
    Execute a raw query against a connection.
    Dedicated execution path via EphemeralJobService.
    """
    service = connection_service.ConnectionService(db)
    connection = service.get_connection(
        connection_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # --- RESOLVE AGENT GROUP ---
    target_agent_group = request.agent_group or (connection.workspace.default_agent_group if connection.workspace else "internal")

    # Create Ephemeral Job
    job_in = EphemeralJobCreate(
        job_type=JobType.EXPLORER,
        connection_id=connection_id,
        payload={
            "query": request.query,
            "limit": request.limit,
            "offset": request.offset,
            "params": request.params
        },
        agent_group=target_agent_group if target_agent_group != "internal" else None
    )
    
    job = EphemeralJobService.create_job(
        db, 
        workspace_id=current_user.active_workspace_id,
        user_id=current_user.id,
        data=job_in
    )

    if not job.agent_group:
        # Execute synchronously for local cloud mode
        EphemeralJobService.execute_locally(db, job)
    
    return job

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
    legacy_history = db.query(QueryHistory, models.connections.Connection.name.label("connection_name"))\
        .join(models.connections.Connection, QueryHistory.connection_id == models.connections.Connection.id)\
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
    
    if agent_group and agent_group != "internal":
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