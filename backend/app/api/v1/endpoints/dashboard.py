from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.schemas.dashboard import DashboardStats
from app.services.dashboard_service import DashboardService

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    time_range: str = Query("24h", regex="^(24h|7d|30d|all|custom)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get aggregated dashboard statistics.
    """
    service = DashboardService(db)
    return service.get_stats(
        user_id=current_user.id, 
        time_range=time_range,
        start_date=start_date,
        end_date=end_date
    )