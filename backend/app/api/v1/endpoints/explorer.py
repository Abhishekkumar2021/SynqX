from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from app.services import connection_service
from app.services.vault_service import VaultService
from synqx_engine.connectors.factory import ConnectorFactory
from synqx_core.models.ephemeral import EphemeralJob
from synqx_core.models.explorer import QueryHistory
from synqx_core.models.user import User
from synqx_core.models.enums import JobType, JobStatus
from pydantic import BaseModel

from app.services.ephemeral_service import EphemeralJobService
from synqx_core.schemas.ephemeral import EphemeralJobCreate, EphemeralJobResponse
from app.utils.agent import is_remote_group
from app.utils.serialization import sanitize_for_json
from app.core.logging import get_logger
from app.core.cache_manager import ResultCacheManager

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
    Execute a raw query against a connection.
    If Agent is remote, creates an EphemeralJob.
    If Agent is internal, executes directly and saves to QueryHistory.
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
    is_remote = is_remote_group(target_agent_group)

    # --- REMOTE EXECUTION ---
    if is_remote:
        job_in = EphemeralJobCreate(
            job_type=JobType.EXPLORER,
            connection_id=connection_id,
            payload={
                "query": request.query,
                "limit": request.limit,
                "offset": request.offset,
                "params": request.params
            },
            agent_group=target_agent_group
        )
        
        job = EphemeralJobService.create_job(
            db, 
            workspace_id=current_user.active_workspace_id,
            user_id=current_user.id,
            data=job_in
        )
        return job

    # --- INTERNAL EXECUTION ---
    # 1. Prepare Params & Cache Check
    query = request.query
    limit = request.limit or 100
    offset = request.offset or 0
    params = request.params or {}
    
    # PERFORMANCE: Check for cached result first
    cached = ResultCacheManager.get_cached_result(connection_id, query, limit, offset, params)
    if cached:
        start_time = datetime.now(timezone.utc)
        results = cached["results"]
        result_summary = cached["summary"]
        status = JobStatus.SUCCESS
        error_msg = None
        execution_time_ms = 0 # Cache hits are near-zero latency
        
        # Still record in history for observability
        history = QueryHistory(
            connection_id=connection_id,
            workspace_id=current_user.active_workspace_id,
            query=query,
            status="success",
            execution_time_ms=0,
            row_count=len(results),
            created_at=start_time,
            created_by=str(current_user.id)
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        
        return EphemeralJobResponse(
            id=history.id,
            job_type=JobType.EXPLORER,
            connection_id=connection_id,
            workspace_id=current_user.active_workspace_id,
            user_id=current_user.id,
            status=status,
            payload=request.model_dump(),
            agent_group=target_agent_group,
            started_at=start_time,
            completed_at=datetime.now(timezone.utc),
            execution_time_ms=0,
            result_summary=result_summary,
            result_sample={"rows": results},
            error_message=None,
            worker_id="cache",
            created_at=start_time,
            updated_at=datetime.now(timezone.utc)
        )

    # 2. Prepare Config & Connector
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
        
        # 3. Execute
        start_time = datetime.now(timezone.utc)
        status = JobStatus.SUCCESS
        error_msg = None
        results = []
        total_count = 0
        
        try:
            try:
                results = connector.execute_query(query=query, limit=limit, offset=offset, **params)
                total_count = connector.get_total_count(query, is_query=True, **params)
            except NotImplementedError:
                results = connector.fetch_sample(asset=query, limit=limit, offset=offset, **params)
                total_count = connector.get_total_count(query, is_query=False, **params)
        except Exception as e:
            status = JobStatus.FAILED
            error_msg = str(e)
            logger.error(f"Internal query execution failed: {e}", exc_info=True)
            
        end_time = datetime.now(timezone.utc)
        execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # 4. Save to Legacy History (so it appears in history tab)
        history = QueryHistory(
            connection_id=connection_id,
            workspace_id=current_user.active_workspace_id,
            query=query,
            status="success" if status == JobStatus.SUCCESS else "failed",
            execution_time_ms=execution_time_ms,
            row_count=len(results),
            error_message=error_msg,
            created_at=start_time,
            created_by=str(current_user.id)
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        
        # 5. Construct Response & Cache Success
        
        # Sample truncation logic
        result_sample = {"rows": results}
        if len(results) > 1000:
            result_sample = {"rows": results[:1000], "is_truncated": True}

        result_summary = None
        if status == JobStatus.SUCCESS:
            columns = list(results[0].keys()) if results else []
            result_summary = sanitize_for_json({
                "count": len(results), 
                "total_count": total_count or 0,
                "columns": columns
            })
            result_sample = sanitize_for_json(result_sample)
            
            # PERFORMANCE: Cache successful internal results
            ResultCacheManager.set_cached_result(
                connection_id, query, limit, offset, params, results, result_summary
            )

        return EphemeralJobResponse(
            id=history.id, # Using history ID as surrogate
            job_type=JobType.EXPLORER,
            connection_id=connection_id,
            workspace_id=current_user.active_workspace_id,
            user_id=current_user.id,
            status=status,
            payload=request.model_dump(),
            agent_group=target_agent_group,
            started_at=start_time,
            completed_at=end_time,
            execution_time_ms=execution_time_ms,
            result_summary=result_summary,
            result_sample=result_sample,
            error_message=error_msg,
            worker_id=None,
            created_at=start_time,
            updated_at=end_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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