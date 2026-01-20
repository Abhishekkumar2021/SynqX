import json
from datetime import UTC, datetime

import redis
from sqlalchemy.orm import Session
from synqx_core.models.enums import (
    AlertDeliveryMethod,
    AlertLevel,
    AlertStatus,
    AlertType,
)

from app import models
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class AlertService:
    @staticmethod
    def trigger_alerts(  # noqa: PLR0912, PLR0913, PLR0915
        db: Session,
        alert_type: AlertType,
        pipeline_id: int,
        job_id: int | None = None,
        message: str | None = None,
        level: AlertLevel = AlertLevel.INFO,
    ) -> list[models.Alert]:
        """
        Trigger alerts based on configuration for a specific event.
        """
        try:
            pipeline = (
                db.query(models.Pipeline)
                .filter(models.Pipeline.id == pipeline_id)
                .first()
            )
            if not pipeline:
                logger.warning(f"Pipeline {pipeline_id} not found for alert trigger")
                return []

            # Find matching configurations
            configs = (
                db.query(models.AlertConfig)
                .filter(
                    models.AlertConfig.enabled,
                    models.AlertConfig.alert_type == alert_type,
                    models.AlertConfig.workspace_id == pipeline.workspace_id,
                )
                .all()
            )

            alerts = []
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

            generated_in_app = False

            for config in configs:
                # Check cooldown
                if config.last_triggered_at:
                    cooldown_seconds = config.cooldown_minutes * 60
                    if (
                        datetime.now(UTC) - config.last_triggered_at.replace(tzinfo=UTC)
                    ).total_seconds() < cooldown_seconds:
                        logger.info(f"Alert config {config.id} in cooldown")
                        continue

                if config.delivery_method == AlertDeliveryMethod.IN_APP:
                    generated_in_app = True

                alert_msg = message or f"Issue detected in pipeline '{pipeline.name}'"

                alert = models.Alert(
                    alert_config_id=config.id,
                    pipeline_id=pipeline_id,
                    job_id=job_id,
                    user_id=pipeline.user_id,
                    workspace_id=pipeline.workspace_id,
                    message=alert_msg,
                    level=level,
                    status=AlertStatus.PENDING,
                    delivery_method=config.delivery_method,
                    recipient=config.recipient,
                )
                db.add(alert)
                db.flush()  # Get the ID

                config.last_triggered_at = datetime.now(UTC)
                db.add(config)
                alerts.append(alert)

                # Dispatch to external delivery worker if needed
                if alert.delivery_method in (
                    AlertDeliveryMethod.SLACK,
                    AlertDeliveryMethod.TEAMS,
                    AlertDeliveryMethod.WEBHOOK,
                    AlertDeliveryMethod.EMAIL,
                ):
                    try:
                        from app.worker.tasks import deliver_alert_task  # noqa: PLC0415

                        deliver_alert_task.delay(alert.id)
                    except Exception as task_err:
                        logger.error(f"Failed to dispatch alert task: {task_err}")

                # Broadcast to WebSocket (scoped to workspace or user? usually workspace)  # noqa: E501
                try:
                    notification_payload = {
                        "id": alert.id,
                        "type": "new_alert",
                        "message": alert.message,
                        "level": alert.level.value,
                        "job_id": alert.job_id,
                        "pipeline_id": alert.pipeline_id,
                        "workspace_id": alert.workspace_id,
                        "created_at": datetime.now(UTC).isoformat(),
                    }
                    # Broadcast to everyone in the workspace
                    redis_client.publish(
                        f"workspace_notifications:{pipeline.workspace_id}",
                        json.dumps(notification_payload),
                    )
                    # Also keep user channel for backward compatibility or direct mentions  # noqa: E501
                    redis_client.publish(
                        f"user_notifications:{pipeline.user_id}",
                        json.dumps(notification_payload),
                    )
                except Exception as broadcast_err:
                    logger.error(f"Failed to broadcast notification: {broadcast_err}")

            # Ensure default In-App notifications for Job Started/Success/Failure
            if not generated_in_app and alert_type in (
                AlertType.JOB_STARTED,
                AlertType.JOB_SUCCESS,
                AlertType.JOB_FAILURE,
            ):
                default_msg = message
                if not default_msg:
                    if alert_type == AlertType.JOB_STARTED:
                        status_str = "started"
                    elif alert_type == AlertType.JOB_SUCCESS:
                        status_str = "succeeded"
                    else:
                        status_str = "failed"
                    default_msg = f"Pipeline '{pipeline.name}' {status_str}."

                alert = models.Alert(
                    alert_config_id=None,
                    pipeline_id=pipeline_id,
                    job_id=job_id,
                    user_id=pipeline.user_id,
                    workspace_id=pipeline.workspace_id,
                    message=default_msg,
                    level=level,
                    status=AlertStatus.PENDING,
                    delivery_method=AlertDeliveryMethod.IN_APP,
                    recipient=str(pipeline.user_id),
                )
                db.add(alert)
                db.flush()
                alerts.append(alert)

                # Broadcast default alert
                try:
                    notification_payload = {
                        "id": alert.id,
                        "type": "new_alert",
                        "message": alert.message,
                        "level": alert.level.value,
                        "job_id": alert.job_id,
                        "pipeline_id": alert.pipeline_id,
                        "workspace_id": alert.workspace_id,
                        "created_at": datetime.now(UTC).isoformat(),
                    }
                    redis_client.publish(
                        f"workspace_notifications:{pipeline.workspace_id}",
                        json.dumps(notification_payload),
                    )
                    redis_client.publish(
                        f"user_notifications:{pipeline.user_id}",
                        json.dumps(notification_payload),
                    )
                except Exception as broadcast_err:
                    logger.error(
                        f"Failed to broadcast default notification: {broadcast_err}"
                    )

            db.commit()
            return alerts
        except Exception as e:
            logger.error(f"Error triggering alerts: {e}", exc_info=True)
            return []

    @staticmethod
    def create_system_alert(
        db: Session,
        workspace_id: int,
        message: str,
        level: AlertLevel = AlertLevel.INFO,
        user_id: int | None = None,
    ):
        """
        Creates a simple In-App system alert and broadcasts it.
        """
        try:
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            alert = models.Alert(
                workspace_id=workspace_id,
                message=message,
                level=level,
                status=AlertStatus.PENDING,
                delivery_method=AlertDeliveryMethod.IN_APP,
                user_id=user_id,
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)

            notification_payload = {
                "id": alert.id,
                "type": "system_notification",
                "message": alert.message,
                "level": alert.level.value,
                "workspace_id": alert.workspace_id,
                "created_at": datetime.now(UTC).isoformat(),
            }
            redis_client.publish(
                f"workspace_notifications:{workspace_id}",
                json.dumps(notification_payload),
            )

        except Exception as e:
            logger.error(f"Error creating system alert: {e}", exc_info=True)
