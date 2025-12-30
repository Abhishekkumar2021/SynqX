from typing import Any, Dict, List, Optional
from datetime import datetime
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.api.deps import get_db, get_current_user
from app.services import connection_service
from app.services.vault_service import VaultService
from app.connectors.factory import ConnectorFactory
from app.models.explorer import QueryHistory
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 100
    offset: Optional[int] = 0
    params: Optional[Dict[str, Any]] = None

class QueryResponse(BaseModel):
    results: List[Dict[str, Any]]
    count: int
    columns: List[str]

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

def execute_connection_query(
    connection_id: int,
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Execute a raw query against a connection.
    Supports SQL and NoSQL depending on the connector type.
    """
    service = connection_service.ConnectionService(db)
    connection = service.get_connection(connection_id, user_id=current_user.id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    start_time = time.time()
    status = "success"
    error_message = None
    row_count = 0
    
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
        
        try:
            results = connector.execute_query(
                query=request.query,
                limit=request.limit,
                offset=request.offset,
                **(request.params or {})
            )
        except NotImplementedError:
            # Fallback for file-based connectors where "query" is the file path/asset name
            results = connector.fetch_sample(
                asset=request.query,
                limit=request.limit,
                offset=request.offset,
                **(request.params or {})
            )
        
        columns = []
        if results and len(results) > 0:
            columns = list(results[0].keys())
            row_count = len(results)
            
        return {
            "results": results,
            "count": row_count,
            "columns": columns
        }
    except Exception as e:
        status = "failed"
        error_message = str(e)
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        execution_time_ms = int((time.time() - start_time) * 1000)
        history_item = QueryHistory(
            connection_id=connection_id,
            query=request.query,
            status=status,
            execution_time_ms=execution_time_ms,
            row_count=row_count,
            error_message=error_message,
            created_by=current_user.email
        )
        db.add(history_item)
        db.commit()

@router.get("/history", response_model=List[HistoryItem])
def get_query_history(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get execution history for the current user.
    """
    history = db.query(QueryHistory)\
        .filter(QueryHistory.created_by == current_user.email)\
        .order_by(desc(QueryHistory.created_at))\
        .limit(limit)\
        .offset(offset)\
        .all()
    
    response = []
    for h in history:
        response.append({
            "id": h.id,
            "query": h.query,
            "status": h.status,
            "execution_time_ms": h.execution_time_ms,
            "row_count": h.row_count,
            "created_at": h.created_at,
            "connection_name": h.connection.name if h.connection else "Unknown",
            "created_by": h.created_by
        })
    return response

@router.delete("/history")
def clear_query_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clear execution history for the current user.
    """
    db.query(QueryHistory).filter(QueryHistory.created_by == current_user.email).delete()
    db.commit()
    return {"status": "success"}

def get_connection_schema_metadata(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get full schema metadata for autocompletion.
    """
    service = connection_service.ConnectionService(db)
    connection = service.get_connection(connection_id, user_id=current_user.id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
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
            except:
                metadata[asset_name] = []
                
        return {
            "connector_type": connection.connector_type,
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
