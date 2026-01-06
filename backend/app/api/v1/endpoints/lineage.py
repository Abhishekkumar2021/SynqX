from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app import models
from app.services.lineage_service import LineageService
from app.schemas.lineage import LineageGraph, ImpactAnalysis

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
def analyze_impact(
    asset_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
) -> Any:
    service = LineageService(db)
    return service.get_impact_analysis(asset_id, current_user.active_workspace_id)
