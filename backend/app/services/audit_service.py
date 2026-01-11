from sqlalchemy.orm import Session
from typing import Optional

from synqx_core.models.audit import AuditLog
from synqx_core.models.enums import AlertLevel
from app.services.alert_service import AlertService

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        *,
        user_id: int,
        workspace_id: Optional[int] = None,
        event_type: str,
        status: str = "success",
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        details: Optional[dict] = None,
        notify: bool = False,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
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
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log_entry)
        db.commit()

        if notify and workspace_id:
            message = details.get("message") if details else "A system event occurred."
            AlertService.create_system_alert(
                db,
                workspace_id=workspace_id,
                message=message,
                level=AlertLevel.INFO if status == "success" else AlertLevel.WARNING,
                user_id=user_id,
            )
