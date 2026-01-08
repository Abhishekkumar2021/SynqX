from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app import models
from app.services.lineage_service import LineageService
from app.schemas.lineage import LineageGraph, ImpactAnalysis, ColumnLineage

router = APIRouter()

@router.get(
    "/graph",
    response_model=LineageGraph,
    summary="Get Global Lineage Graph",
    description="Returns the visual dependency graph of all assets and pipelines in the workspace."
)
def get_lineage_graph(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
) -> Any:
    service = LineageService(db)
    return service.get_global_lineage(current_user.active_workspace_id)

@router.get(
    "/impact/{asset_id}",
    response_model=ImpactAnalysis,
    summary="Analyze Impact",
    description="Trace downstream dependencies to understand the impact of changing an asset."
)
@router.get(
    "/column/{asset_id}/{column_name}",
    response_model=ColumnLineage,
    summary="Trace Column Lineage",
    description="Trace a specific column back to its source across all pipelines."
)
def get_column_lineage(
    asset_id: int,
    column_name: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
) -> Any:
    service = LineageService(db)
    return service.get_column_lineage(asset_id, column_name, current_user.active_workspace_id)
