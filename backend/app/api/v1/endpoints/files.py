from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.services.connection_service import ConnectionService
from app.services.vault_service import VaultService
from app.connectors.factory import ConnectorFactory
from app.models.user import User
from app.core.logging import get_logger
import os

router = APIRouter()
logger = get_logger(__name__)

def get_connector(connection_id: int, db: Session, current_user: User):
    service = ConnectionService(db)
    connection = service.get_connection(connection_id, user_id=current_user.id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    config = VaultService.get_connector_config(connection)
    connector = ConnectorFactory.get_connector(
        connector_type=connection.connector_type.value,
        config=config
    )
    return connector

@router.get("/{connection_id}/list")
def list_files(
    connection_id: int,
    path: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real-time file listing for a connection."""
    connector = get_connector(connection_id, db, current_user)
    try:
        files = connector.list_files(path=path)
        return {"files": files, "current_path": path}
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{connection_id}/download")
def download_file(
    connection_id: int,
    path: str,
    inline: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real-time file download for a connection."""
    connector = get_connector(connection_id, db, current_user)
    try:
        logger.info(f"Downloading file: {path} for connection: {connection_id}")

        content = connector.download_file(path=path)
        filename = os.path.basename(path)
        
        # Determine media type based on extension
        import mimetypes
        media_type, _ = mimetypes.guess_type(path)
        
        # Explicit override for common types if guessing fails or to be sure
        if path.lower().endswith('.pdf'):
            media_type = "application/pdf"
        elif not media_type:
            media_type = "application/octet-stream"

        # Quote filename to handle spaces and special characters correctly in headers
        # Use filename* for better international character support if needed, but simple quoting helps most cases
        disposition = "inline" if inline else f'attachment; filename="{filename}"'

        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": disposition,
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/upload")
async def upload_file(
    connection_id: int,
    path: str = "",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real-time file upload for a connection."""
    connector = get_connector(connection_id, db, current_user)
    try:
        content = await file.read()
        filename = file.filename
        
        # Ensure path uses forward slashes and doesn't have trailing slash for join
        clean_path = path.strip().replace('\\', '/')
        if clean_path.endswith('/'):
            clean_path = clean_path[:-1]
            
        full_remote_path = f"{clean_path}/{filename}" if clean_path else filename
        
        success = connector.upload_file(path=full_remote_path, content=content)
        return {"success": success, "filename": filename, "path": full_remote_path}
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from pydantic import BaseModel

class SaveFileRequest(BaseModel):
    path: str
    content: str

@router.post("/{connection_id}/save")
def save_file(
    connection_id: int,
    request: SaveFileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save text content to a file on the remote connection."""
    connector = get_connector(connection_id, db, current_user)
    try:
        # Convert string content back to bytes for the connector
        content_bytes = request.content.encode('utf-8')
        success = connector.upload_file(path=request.path, content=content_bytes)
        return {"success": success}
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{connection_id}/delete")
def delete_file(
    connection_id: int,
    path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real-time file deletion for a connection."""
    connector = get_connector(connection_id, db, current_user)
    try:
        success = connector.delete_file(path=path)
        return {"success": success}
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/mkdir")
def create_directory(
    connection_id: int,
    path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real-time directory creation for a connection."""
    connector = get_connector(connection_id, db, current_user)
    try:
        success = connector.create_directory(path=path)
        return {"success": success}
    except NotImplementedError as e:
        raise HTTPException(status_code=405, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{connection_id}/zip")
def zip_directory(
    connection_id: int,
    path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real-time directory zipping and download for a connection."""
    connector = get_connector(connection_id, db, current_user)
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
