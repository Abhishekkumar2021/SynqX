from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from synqx_core.schemas.audit import AuditLogListResponse

from app import models
from app.api import deps
from app.services.audit_service import AuditLog

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(  # noqa: PLR0913
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_admin),  # noqa: B008
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: int | None = Query(None, description="Filter by user ID"),
    event_type: str | None = Query(None, description="Filter by event type"),
    target_type: str | None = Query(None, description="Filter by target type"),
    target_id: int | None = Query(None, description="Filter by target ID"),
    status: str | None = Query(None, description="Filter by status (success/failure)"),
    start_date: datetime | None = Query(None, description="Filter by start date"),  # noqa: B008
    end_date: datetime | None = Query(None, description="Filter by end date"),  # noqa: B008
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
def export_audit_logs(  # noqa: PLR0913
    db: Session = Depends(deps.get_db),  # noqa: B008
    current_user: models.User = Depends(deps.get_current_user),  # noqa: B008
    _: models.WorkspaceMember = Depends(deps.require_admin),  # noqa: B008
    user_id: int | None = Query(None),
    event_type: str | None = Query(None),
    status: str | None = Query(None),
    start_date: datetime | None = Query(None),  # noqa: B008
    end_date: datetime | None = Query(None),  # noqa: B008
):
    """
    Export audit logs as CSV.
    """
    import csv  # noqa: PLC0415
    import io  # noqa: PLC0415

    from fastapi.responses import StreamingResponse  # noqa: PLC0415

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
