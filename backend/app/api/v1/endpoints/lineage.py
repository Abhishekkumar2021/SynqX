from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from synqx_core.schemas.lineage import (
    ColumnImpactAnalysis,
    ColumnLineage,
    ImpactAnalysis,
    LineageGraph,
)

from app import models
from app.api import deps
from app.services.lineage_service import LineageService

router = APIRouter()


@router.get(
    "/graph",
    response_model=LineageGraph,
    summary="Get Global Lineage Graph",
    description="Returns the visual dependency graph of all assets and pipelines in the workspace.",  # noqa: E501
)
def get_lineage_graph(
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
) -> Any:
    service = LineageService(db)
    return service.get_global_lineage(current_user.active_workspace_id)


@router.get(
    "/impact/{asset_id}",
    response_model=ImpactAnalysis,
    summary="Analyze Asset Impact",
    description="Trace downstream dependencies to understand the impact of changing an asset.",  # noqa: E501
)
def get_asset_impact(
    asset_id: int,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
) -> Any:
    service = LineageService(db)
    return service.get_impact_analysis(asset_id, current_user.active_workspace_id)


@router.get(
    "/impact/column/{asset_id}/{column_name}",
    response_model=ColumnImpactAnalysis,
    summary="Analyze Column Impact",
    description="Trace downstream dependencies for a specific column to understand the impact of changes.",  # noqa: E501
)
def get_column_impact(
    asset_id: int,
    column_name: str,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
) -> Any:
    service = LineageService(db)
    return service.get_column_impact_analysis(
        asset_id, column_name, current_user.active_workspace_id
    )


@router.get(
    "/column/{asset_id}/{column_name}",
    response_model=ColumnLineage,
    summary="Trace Column Lineage",
    description="Trace a specific column back to its source across all pipelines.",
)
def get_column_lineage(
    asset_id: int,
    column_name: str,
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_viewer),  # noqa: B008
) -> Any:
    service = LineageService(db)
    return service.get_column_lineage(
        asset_id, column_name, current_user.active_workspace_id
    )
