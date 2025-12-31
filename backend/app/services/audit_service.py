from sqlalchemy.orm import Session
from typing import Optional

from app.models.audit import AuditLog
from app.models.enums import AlertLevel
from app.services.alert_service import AlertService

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        *,
        user_id: int,
        workspace_id: int,
        event_type: str,
        status: str = "success",
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        details: Optional[dict] = None,
        notify: bool = False,
    ):
        """
        Logs a generic audit event and optionally creates a system-wide notification.
        """
        log_entry = AuditLog(
            user_id=user_id,
            workspace_id=workspace_id,
            event_type=event_type,
            status=status,
            target_type=target_type,
            target_id=target_id,
            details=details
        )
        db.add(log_entry)
        db.commit()

        if notify:
            message = details.get("message") if details else "A system event occurred."
            AlertService.create_system_alert(
                db,
                workspace_id=workspace_id,
                message=message,
                level=AlertLevel.INFO if status == "success" else AlertLevel.WARNING,
                user_id=user_id,
            )
