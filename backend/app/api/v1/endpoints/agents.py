import io
import os
import zipfile
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.api import deps
from app.schemas.agent import (
    AgentCreate, AgentResponse, AgentToken, AgentHeartbeat,
    AgentJobStatusUpdate, AgentJobLogEntry, AgentStepUpdate
)
from app.schemas.ephemeral import EphemeralJobUpdate
from app.schemas.pipeline import PipelineVersionRead
from app.services.agent_service import AgentService
from app.services.ephemeral_service import EphemeralJobService
from app.models.agent import Agent
from app.models.user import User
from app.models.execution import Job, JobStatus, PipelineRun
from app.models.ephemeral import EphemeralJob
from app.models.monitoring import JobLog
from app.models.enums import PipelineRunStatus, OperatorRunStatus
from app.models.pipelines import PipelineVersion
from app.services.vault_service import VaultService
from app.engine.agent_core.state_manager import StateManager

from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

class AgentExportRequest(BaseModel):
    agent_name: str
    client_id: str
    api_key: str
    tags: str = "default"

# --- User Facing Endpoints ---

@router.get("/", response_model=List[AgentResponse])
def list_agents(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """List all agents in the current workspace"""
    workspace_id = getattr(current_user, "active_workspace_id", None)
    if not workspace_id:
        if current_user.workspaces:
             workspace_id = current_user.workspaces[0].workspace_id
        else:
             return []
             
    return AgentService.list_agents(db, workspace_id)

@router.post("/", response_model=AgentToken)
def create_agent(
    agent_in: AgentCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """Register a new agent (User Only)"""
    workspace_id = getattr(current_user, "active_workspace_id", None)
    if not workspace_id and current_user.workspaces:
        workspace_id = current_user.workspaces[0].workspace_id
    
    if not workspace_id:
         raise HTTPException(status_code=400, detail="No active workspace")

    try:
        return AgentService.register_agent(db, workspace_id, agent_in, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """Remove a agent"""
    workspace_id = getattr(current_user, "active_workspace_id", None)
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No workspace found")
    AgentService.delete_agent(db, agent_id, workspace_id)


# --- Agent Facing Endpoints ---

def get_current_agent(
    x_synqx_client_id: str = Header(..., description="Agent Client ID"),
    x_synqx_api_key: str = Header(..., description="Agent Secret API Key"),
    db: Session = Depends(deps.get_db)
) -> Agent:
    agent = AgentService.authenticate_agent(db, x_synqx_client_id, x_synqx_api_key)
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid Agent Credentials")
    return agent

@router.post("/heartbeat", response_model=AgentResponse)
def agent_heartbeat(
    heartbeat: AgentHeartbeat,
    agent: Agent = Depends(get_current_agent),
    db: Session = Depends(deps.get_db),
):
    """Agent ping to say 'I am alive'"""
    return AgentService.record_heartbeat(db, agent, heartbeat)

@router.post("/jobs/{job_id}/status")
def update_job_status(
    job_id: int,
    status_update: AgentJobStatusUpdate,
    agent: Agent = Depends(get_current_agent),
    db: Session = Depends(deps.get_db),
):
    """Agent reports job status change"""
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
        
    if job.worker_id != agent.client_id:
        raise HTTPException(403, "Job not assigned to this agent")

    status_map = {
        "running": JobStatus.RUNNING,
        "success": JobStatus.SUCCESS,
        "failed": JobStatus.FAILED
    }
    new_status = status_map.get(status_update.status.lower())
    
    if new_status:
        job.status = new_status
        if new_status == JobStatus.SUCCESS:
            job.completed_at = datetime.now(timezone.utc)
            job.execution_time_ms = status_update.execution_time_ms
        elif new_status == JobStatus.FAILED:
             job.completed_at = datetime.now(timezone.utc)
             job.infra_error = status_update.message

    if job.run:
        run_status_map = {
            "running": PipelineRunStatus.RUNNING,
            "success": PipelineRunStatus.COMPLETED,
            "failed": PipelineRunStatus.FAILED
        }
        if status_update.status.lower() in run_status_map:
            job.run.status = run_status_map[status_update.status.lower()]
            job.run.error_message = status_update.message
            if status_update.status.lower() in ["success", "failed"]:
                job.run.completed_at = datetime.now(timezone.utc)
                job.run.duration_seconds = (status_update.execution_time_ms or 0) / 1000.0
            
            if status_update.total_records:
                job.run.total_loaded = status_update.total_records
            if status_update.total_bytes:
                job.run.bytes_processed = status_update.total_bytes

    db.commit()
    return {"status": "updated"}

@router.post("/jobs/{job_id}/steps")
def update_step_status(
    job_id: int,
    step_update: AgentStepUpdate,
    agent: Agent = Depends(get_current_agent),
    db: Session = Depends(deps.get_db),
):
    """
    Agent reports granular step execution status.
    This enables real-time progress bars and forensics in the UI.
    """
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
        
    if job.worker_id != agent.client_id:
        raise HTTPException(403, "Job not assigned to this agent")

    if not job.run:
        # Should not happen if protocol is followed (run created at poll)
        raise HTTPException(400, "Pipeline run not initialized")

    # Use StateManager for consistency with internal worker logic
    state_manager = StateManager(db, job_id)
    
    # Resolve step run
    from app.models.execution import StepRun
    step_run = db.query(StepRun).filter(
        StepRun.pipeline_run_id == job.run.id,
        StepRun.node_id == step_update.node_id
    ).first()
    
    # Map status string to enum
    status_map = {
        "pending": OperatorRunStatus.PENDING,
        "running": OperatorRunStatus.RUNNING,
        "success": OperatorRunStatus.SUCCESS,
        "failed": OperatorRunStatus.FAILED,
        "skipped": OperatorRunStatus.SKIPPED
    }
    op_status = status_map.get(step_update.status.lower(), OperatorRunStatus.RUNNING)

    if not step_run:
        # Create on the fly if missing (Agent might be first to report)
        # Note: We don't know the operator type/index easily here without looking up the DAG
        # But StateManager.create_step_run needs them.
        # Fallback: Look up node in pipeline version
        pipeline_version = job.pipeline_version
        node = next((n for n in pipeline_version.nodes if n.node_id == step_update.node_id), None)
        if node:
            step_run = state_manager.create_step_run(
                job.run.id, 
                node.id, 
                node.operator_type, 
                node.order_index
            )
        else:
             logger.warning(f"Node {step_update.node_id} not found in version {pipeline_version.id}")
             # We can't create it properly without metadata, so we might skip or fail.
             # Let's fail for data integrity.
             raise HTTPException(400, f"Unknown node {step_update.node_id}")

    # Pass data to StateManager
    # This handles metrics, timing, and WebSocket broadcasting automatically
    state_manager.update_step_status(
        step_run=step_run,
        status=op_status,
        records_in=step_update.records_in,
        records_out=step_update.records_out,
        records_filtered=step_update.records_filtered,
        records_error=step_update.records_error,
        bytes_processed=step_update.bytes_processed,
        cpu_percent=step_update.cpu_percent,
        memory_mb=step_update.memory_mb,
        sample_data=step_update.sample_data,
        error=Exception(step_update.error_message) if step_update.error_message else None
    )

    return {"status": "ok"}

@router.post("/jobs/{job_id}/logs")
def upload_job_logs(
    job_id: int,
    logs: List[AgentJobLogEntry],
    agent: Agent = Depends(get_current_agent),
    db: Session = Depends(deps.get_db),
):
    """Agent sends execution logs"""
    job = db.query(Job).get(job_id)
    if not job or job.worker_id != agent.client_id:
        raise HTTPException(403, "Invalid job access")
        
    for log_entry in logs:
        db_log = JobLog(
            job_id=job.id,
            level=log_entry.level.upper(),
            message=log_entry.message,
            timestamp=log_entry.timestamp or datetime.now(timezone.utc),
            details={"node_id": log_entry.node_id} if log_entry.node_id else None
        )
        db.add(db_log)
    
    db.commit()
    return {"count": len(logs)}

@router.post("/jobs/ephemeral/{job_id}/status")
def update_ephemeral_job(
    job_id: int,
    update: EphemeralJobUpdate,
    agent: Agent = Depends(get_current_agent),
    db: Session = Depends(deps.get_db),
):
    """Agent reports result of an ephemeral job."""
    job = db.query(EphemeralJob).get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.worker_id != agent.client_id:
        raise HTTPException(403, "Job not assigned to this agent")
        
    EphemeralJobService.update_job(db, job_id, update)
    return {"status": "ok"}

@router.post("/export")
def export_agent_package(
    data: AgentExportRequest,
    db: Session = Depends(deps.get_db)
):
    """
    Generates a pre-configured ZIP package of the SynqX Agent.
    """
    agent_name = data.agent_name
    client_id = data.client_id
    api_key = data.api_key
    tags = data.tags

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        agent_dir = os.path.join(os.getcwd(), "agent")
        if not os.path.exists(agent_dir):
             agent_dir = os.path.join(os.getcwd(), "..", "agent")

        for root, _, files in os.walk(agent_dir):
            for file in files:
                if file.endswith(".pyc") or "__pycache__" in root or ".env" in file or ".venv" in root:
                    continue
                file_path = os.path.join(root, file)
                archive_path = os.path.relpath(file_path, agent_dir)
                zip_file.write(file_path, archive_path)

        # Pre-configured .env
        env_content = f"""SYNQX_API_URL=http://localhost:8000/api/v1
SYNQX_CLIENT_ID={client_id}
SYNQX_API_KEY={api_key}
SYNQX_TAGS={tags}
"""
        zip_file.writestr(".env", env_content)

        readme = f"""# SynqX Agent: {agent_name}
Quick Start:
1. Extract ZIP
2. pip install -e .
3. synqx-agent start
"""
        zip_file.writestr("README.md", readme)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/x-zip-compressed",
        headers={
            "Content-Disposition": f"attachment; filename=synqx-agent-{agent_name.lower().replace(' ', '-')}.zip"
        }
    )

@router.post("/poll")
def poll_jobs(
    tags: List[str],
    agent: Agent = Depends(get_current_agent),
    db: Session = Depends(deps.get_db),
):
    """Agent asks for pending jobs matching its tags."""
    
    # Check for any queued jobs for this workspace
    queued_count = db.query(Job).filter(
        Job.status == JobStatus.QUEUED,
        Job.workspace_id == agent.workspace_id
    ).count()
    
    logger.info(f"Poll from Agent {agent.name} (ID: {agent.id}, WS: {agent.workspace_id}). Tags: {tags}. Total Queued in WS: {queued_count}")

    job = db.query(Job).filter(
        and_(
            Job.status == JobStatus.QUEUED,
            Job.queue_name.in_(tags),
            Job.workspace_id == agent.workspace_id 
        )
    ).with_for_update(skip_locked=True).first()

    if not job:
        # 2. Check for Ephemeral Jobs (Interactive Queries, etc)
        from app.models.ephemeral import EphemeralJob
        ephemeral = db.query(EphemeralJob).filter(
            and_(
                EphemeralJob.status == JobStatus.QUEUED,
                EphemeralJob.agent_group.in_(tags),
                EphemeralJob.workspace_id == agent.workspace_id
            )
        ).with_for_update(skip_locked=True).first()

        if ephemeral:
            logger.info(f"Assigning Ephemeral Job {ephemeral.id} to Agent {agent.name}")
            ephemeral.status = JobStatus.RUNNING
            ephemeral.worker_id = agent.client_id
            ephemeral.started_at = datetime.now(timezone.utc)
            
            # Resolve connection info
            conn_payload = None
            if ephemeral.connection:
                config = VaultService.get_connector_config(ephemeral.connection)
                conn_payload = {
                    "id": ephemeral.connection.id,
                    "type": ephemeral.connection.connector_type.value,
                    "config": config
                }
            
            db.commit()
            return {
                "ephemeral": {
                    "id": ephemeral.id,
                    "type": ephemeral.job_type.value,
                    "payload": ephemeral.payload,
                    "connection": conn_payload
                }
            }

        return {"job": None}

    # IMPORTANT: Transition to RUNNING and commit immediately
    logger.info(f"Assigning Job {job.id} to Agent {agent.name}")
    job.status = JobStatus.RUNNING
    job.worker_id = agent.client_id
    job.started_at = datetime.now(timezone.utc)
    
    run = job.run
    if not run:
        run = PipelineRun(
            job_id=job.id,
            pipeline_id=job.pipeline_id,
            pipeline_version_id=job.pipeline_version_id,
            run_number=0, 
            status=PipelineRunStatus.INITIALIZING,
            workspace_id=job.workspace_id,
            user_id=job.user_id,
            started_at=datetime.now(timezone.utc)
        )
        last_run = db.query(PipelineRun).filter(
            PipelineRun.pipeline_id == job.pipeline_id
        ).order_by(PipelineRun.run_number.desc()).first()
        run.run_number = (last_run.run_number + 1) if last_run else 1
        db.add(run)
    
    # NOTE: We do NOT commit yet. We wait until payload is fully built.
    # If serialization fails, the transaction rolls back and job remains QUEUED.

    # Serialize Payload
    pipeline_version = db.query(PipelineVersion).get(job.pipeline_version_id)
    if not pipeline_version:
        logger.error(f"Job {job.id} refers to missing version {job.pipeline_version_id}")
        return {"job": None} # Or raise 500, but checking validity is safer

    dag_schema = PipelineVersionRead.model_validate(pipeline_version)

    connections_map = {}
    for node in pipeline_version.nodes:
        conn = None
        if node.source_asset and node.source_asset.connection:
            conn = node.source_asset.connection
        elif node.destination_asset and node.destination_asset.connection:
            conn = node.destination_asset.connection
            
        if conn and conn.id not in connections_map:
            try:
                # Decrypt configuration for the agent
                config = VaultService.get_connector_config(conn)
                
                connections_map[conn.id] = {
                    "id": conn.id,
                    "type": conn.connector_type.value,
                    "config": config, 
                    "secrets": {} 
                }
            except Exception as e:
                logger.error(f"Failed to decrypt config for connection {conn.id}: {e}")
                # We fail the request so the job isn't stuck in limbo.
                # The agent will retry, and hopefully this is transient or logged.
                raise HTTPException(status_code=500, detail=f"Failed to prepare connection config: {str(e)}")

    # Commit state change only after successful payload construction
    db.commit()

    return {
        "job": {
            "id": job.id,
            "pipeline_id": job.pipeline_id,
            "run_id": run.id,
            "queue": job.queue_name
        },
        "dag": dag_schema.model_dump(mode='json'),
        "connections": connections_map,
        "config": {
            "max_retries": job.max_retries,
            "timeout_seconds": pipeline_version.pipeline.execution_timeout_seconds if pipeline_version.pipeline else 3600
        }
    }