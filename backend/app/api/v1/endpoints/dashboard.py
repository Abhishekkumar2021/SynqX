from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from synqx_core.schemas.dashboard import DashboardStats

from app import models
from app.api import deps
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    time_range: str = Query("24h", pattern="^(24h|7d|30d|all|custom)$"),
    start_date: datetime | None = Query(None),  # noqa: B008
    end_date: datetime | None = Query(None),  # noqa: B008
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
) -> Any:
    """
    Get aggregated dashboard statistics.
    """
    service = DashboardService(db)
    return service.get_stats(
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id,
        time_range=time_range,
        start_date=start_date,
        end_date=end_date,
    )
