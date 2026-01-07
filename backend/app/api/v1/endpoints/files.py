from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models
from app.api import deps
from app.services.connection_service import ConnectionService
from app.services.vault_service import VaultService
from app.connectors.factory import ConnectorFactory
from app.models.user import User
from app.core.logging import get_logger
from app.services.ephemeral_service import EphemeralJobService
from app.schemas.ephemeral import EphemeralJobCreate
from app.models.enums import JobType, JobStatus
from app.utils.agent import is_remote_group
import os
import time
import base64

router = APIRouter()
logger = get_logger(__name__)

def get_routing_info(connection_id: int, db: Session, current_user: User):
    service = ConnectionService(db)
    connection = service.get_connection(
        connection_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    agent_group = connection.workspace.default_agent_group if connection.workspace else "internal"
    return connection, agent_group

@router.get("/{connection_id}/list")
def list_files(
    connection_id: int,
    path: str = "",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    """Real-time file listing for a connection."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)
    
    if is_remote_group(agent_group):
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "list", "path": path},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        # Polling wait
        start = time.time()
        while time.time() - start < 30:
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
            
        if updated.status == JobStatus.FAILED:
            raise HTTPException(400, f"Remote file listing failed: {updated.error_message}")
        if updated.status != JobStatus.SUCCESS:
            raise HTTPException(408, "Remote agent timed out")
            
        return {"files": updated.result_sample.get("files", []), "current_path": path, "job_id": job.id}

    # LOCAL MODE
    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        files = connector.list_files(path=path)
        return {"files": files, "current_path": path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/mkdir")
def create_directory(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    """Real-time directory creation for a connection."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)

    if is_remote_group(agent_group):
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "mkdir", "path": path},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        start = time.time()
        while time.time() - start < 30:
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
        return {"success": updated.status == JobStatus.SUCCESS}

    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        success = connector.create_directory(path=path)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SaveFileRequest(BaseModel):
    path: str
    content: str

@router.get("/{connection_id}/download")
def download_file(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    """Real-time file download."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)

    if is_remote_group(agent_group):
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "read", "path": path},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        start = time.time()
        while time.time() - start < 45: # Longer timeout for transfer
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
            
        if updated.status == JobStatus.FAILED:
            raise HTTPException(400, f"Remote download failed: {updated.error_message}")
        if updated.status != JobStatus.SUCCESS:
            raise HTTPException(408, "Remote agent timed out")
            
        b64_content = updated.result_sample.get("content")
        if not b64_content:
            raise HTTPException(500, "No content returned from agent")
            
        content = base64.b64decode(b64_content)
        filename = os.path.basename(path)
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        content = connector.download_file(path=path)
        filename = os.path.basename(path)
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/upload")
async def upload_file(
    connection_id: int,
    path: str = "",
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    """Real-time file upload."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)
    
    content = await file.read()
    
    if is_remote_group(agent_group):
        b64_content = base64.b64encode(content).decode('utf-8')
        target_path = os.path.join(path, file.filename) if path else file.filename
        
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "write", "path": target_path, "content": b64_content},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        start = time.time()
        while time.time() - start < 60:
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
            
        if updated.status == JobStatus.FAILED:
            raise HTTPException(400, f"Remote upload failed: {updated.error_message}")
        return {"success": updated.status == JobStatus.SUCCESS}

    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        target_path = os.path.join(path, file.filename) if path else file.filename
        success = connector.upload_file(path=target_path, content=content)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/save")
def save_file(
    connection_id: int,
    body: SaveFileRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    """Real-time file save (overwrite content)."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)
    
    if is_remote_group(agent_group):
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "save", "path": body.path, "content": body.content},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        start = time.time()
        while time.time() - start < 30:
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
        return {"success": updated.status == JobStatus.SUCCESS}

    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        # Convert string content to bytes for local connector
        success = connector.upload_file(path=body.path, content=body.content.encode('utf-8'))
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{connection_id}/delete")
def delete_file(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    """Real-time file/directory deletion."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)
    
    if is_remote_group(agent_group):
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "delete", "path": path},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        start = time.time()
        while time.time() - start < 30:
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
        return {"success": updated.status == JobStatus.SUCCESS}

    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        success = connector.delete_file(path=path)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{connection_id}/zip")
def zip_directory(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    """Real-time directory zipping and download."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)

    if is_remote_group(agent_group):
        job_in = EphemeralJobCreate(
            job_type=JobType.FILE,
            connection_id=connection_id,
            payload={"action": "zip", "path": path},
            agent_group=agent_group
        )
        job = EphemeralJobService.create_job(db, connection.workspace_id, current_user.id, job_in)
        
        start = time.time()
        while time.time() - start < 60:
            db.expire_all()
            from app.models.ephemeral import EphemeralJob
            updated = db.query(EphemeralJob).get(job.id)
            if updated.status in [JobStatus.SUCCESS, JobStatus.FAILED]:
                break
            time.sleep(0.5)
            
        if updated.status == JobStatus.FAILED:
            raise HTTPException(400, f"Remote zip failed: {updated.error_message}")
        if updated.status != JobStatus.SUCCESS:
            raise HTTPException(408, "Remote agent timed out")
            
        b64_content = updated.result_sample.get("content")
        if not b64_content:
            raise HTTPException(500, "No content returned from agent")
            
        content = base64.b64decode(b64_content)
        dirname = os.path.basename(path) or "root"
        filename = f"{dirname}.zip"
        return Response(
            content=content,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(connection.connector_type.value, config)
    try:
        content = connector.zip_directory(path=path)
        dirname = os.path.basename(path) or "root"
        filename = f"{dirname}.zip"
        return Response(
            content=content,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
