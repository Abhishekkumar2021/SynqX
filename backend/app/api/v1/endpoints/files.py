import base64
import os

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from synqx_core.models.user import User

from app import models
from app.api import deps
from app.core.logging import get_logger
from app.services.connection_service import ConnectionService

router = APIRouter()
logger = get_logger(__name__)


def get_routing_info(connection_id: int, db: Session, current_user: User):
    service = ConnectionService(db)
    connection = service.get_connection(
        connection_id,
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    agent_group = (
        connection.workspace.default_agent_group if connection.workspace else "internal"
    )
    return connection, agent_group


@router.get("/{connection_id}/list")
def list_files(
    connection_id: int,
    path: str = "",
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
):
    """Real-time file listing for a connection."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    try:
        sample_data = service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"List Files: {path}",
            config={"action": "list", "path": path},
        )
        return {"files": sample_data.get("files", []), "current_path": path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904


@router.post("/{connection_id}/mkdir")
def create_directory(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_editor),  # noqa: B008
):
    """Real-time directory creation for a connection."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    try:
        service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"Create Directory: {path}",
            config={"action": "mkdir", "path": path},
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904


class SaveFileRequest(BaseModel):
    path: str
    content: str


@router.get("/{connection_id}/download")
def download_file(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
):
    """Real-time file download."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    try:
        sample_data = service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"Download File: {path}",
            config={"action": "read", "path": path},
        )

        b64_content = sample_data.get("content")
        if not b64_content:
            raise HTTPException(500, "No content returned from data source")

        content = base64.b64decode(b64_content)
        filename = os.path.basename(path)
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904


@router.post("/{connection_id}/upload")
async def upload_file(
    connection_id: int,
    path: str = "",
    file: UploadFile = File(...),  # noqa: B008
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_editor),  # noqa: B008
):
    """Real-time file upload."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    content = await file.read()
    b64_content = base64.b64encode(content).decode("utf-8")
    target_path = os.path.join(path, file.filename) if path else file.filename

    try:
        service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"Upload File: {target_path}",
            config={"action": "write", "path": target_path, "content": b64_content},
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904


@router.post("/{connection_id}/save")
def save_file(
    connection_id: int,
    body: SaveFileRequest,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_editor),  # noqa: B008
):
    """Real-time file save (overwrite content)."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    try:
        service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"Save File: {body.path}",
            config={"action": "save", "path": body.path, "content": body.content},
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904


@router.delete("/{connection_id}/delete")
def delete_file(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_editor),  # noqa: B008
):
    """Real-time file/directory deletion."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    try:
        service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"Delete: {path}",
            config={"action": "delete", "path": path},
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904


@router.get("/{connection_id}/zip")
def zip_directory(
    connection_id: int,
    path: str,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
):
    """Real-time directory zipping and download."""
    connection, agent_group = get_routing_info(connection_id, db, current_user)  # noqa: RUF059
    service = ConnectionService(db)

    try:
        sample_data = service._trigger_ephemeral_job(
            connection_id=connection_id,
            agent_group=agent_group,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            task_name=f"Archive: {path}",
            config={"action": "zip", "path": path},
        )

        b64_content = sample_data.get("content")
        if not b64_content:
            raise HTTPException(500, "No content returned from agent")

        content = base64.b64decode(b64_content)
        dirname = os.path.basename(path) or "root"
        filename = f"{dirname}.zip"
        return Response(
            content=content,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))  # noqa: B904
