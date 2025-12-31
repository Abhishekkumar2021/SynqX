from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app import models
from app.api import deps
from app.services.audit_service import AuditLog
from app.schemas.audit import AuditLogListResponse

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    target_id: Optional[int] = Query(None, description="Filter by target ID"),
    status: Optional[str] = Query(
        None, description="Filter by status (success/failure)"
    ),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
):
    """
    Retrieve audit logs for the current workspace.
    Only accessible by workspace admins.
    """
    query = db.query(AuditLog).filter(
        AuditLog.workspace_id == current_user.active_workspace_id
    )

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if event_type:
        query = query.filter(AuditLog.event_type.ilike(f"%{event_type}%"))
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if target_id:
        query = query.filter(AuditLog.target_id == target_id)
    if status:
        query = query.filter(AuditLog.status == status)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    total = query.count()

    # Sorting
    sort_attr = getattr(AuditLog, sort_by, AuditLog.created_at)
    order_func = desc if sort_order == "desc" else asc

    items = query.order_by(order_func(sort_attr)).offset(skip).limit(limit).all()

    return {"items": items, "total": total, "limit": limit, "offset": skip}


@router.get("/export")
def export_audit_logs(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
    user_id: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """
    Export audit logs as CSV.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    query = db.query(AuditLog).filter(
        AuditLog.workspace_id == current_user.active_workspace_id
    )

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if event_type:
        query = query.filter(AuditLog.event_type.ilike(f"%{event_type}%"))
    if status:
        query = query.filter(AuditLog.status == status)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    logs = query.order_by(AuditLog.created_at.desc()).all()

    def generate():
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(
            [
                "ID",
                "Timestamp",
                "Event Type",
                "User ID",
                "Target Type",
                "Target ID",
                "Status",
                "Details",
            ]
        )
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for log in logs:
            writer.writerow(
                [
                    log.id,
                    log.created_at.isoformat(),
                    log.event_type,
                    log.user_id,
                    log.target_type,
                    log.target_id,
                    log.status,
                    str(log.details),
                ]
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    filename = f"audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
