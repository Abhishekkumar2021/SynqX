from datetime import datetime, timezone, timedelta
from celery.exceptions import SoftTimeLimitExceeded, Retry
from app.core.celery_app import celery_app
from app.core.logging import get_logger
from app.db.session import session_scope
from synqx_core.models.execution import Job, PipelineRun
from synqx_core.models.enums import JobStatus, PipelineRunStatus
from synqx_core.models.pipelines import PipelineVersion
from app.engine.agent_engine import PipelineAgent as PipelineRunner
from app.core.db_logging import DBLogger
from app.core.errors import ConfigurationError, PipelineExecutionError
import httpx

logger = get_logger(__name__)


@celery_app.task(name="app.worker.tasks.test_celery")
def test_celery():
    """Health check task for Celery workers."""
    return "Celery OK"


@celery_app.task(
    name="app.worker.tasks.deliver_alert_task",
    bind=True,
    max_retries=5,
    default_retry_delay=30,
)
def deliver_alert_task(self, alert_id: int):
    """Deliver an alert to an external system (Slack, Teams, Webhook)."""
    from synqx_core.models.monitoring import Alert
    from synqx_core.models.enums import AlertStatus, AlertDeliveryMethod

    with session_scope() as session:
        alert = session.query(Alert).filter(Alert.id == alert_id).first()
        if not alert or not alert.recipient:
            return

        alert.status = AlertStatus.SENDING
        session.commit()

        try:
            success = False
            if alert.delivery_method == AlertDeliveryMethod.SLACK:
                # Basic Slack Webhook implementation
                payload = {
                    "text": f"*{alert.level.value.upper()}*: {alert.message}",
                    "attachments": [{
                        "color": "#36a64f" if alert.level.value == "success" else "#ff0000",
                        "fields": [
                            {"title": "Pipeline ID", "value": str(alert.pipeline_id), "short": True},
                            {"title": "Job ID", "value": str(alert.job_id) if alert.job_id else "N/A", "short": True}
                        ],
                        "footer": "SynqX Notification System",
                        "ts": int(datetime.now(timezone.utc).timestamp())
                    }]
                }
                response = httpx.post(alert.recipient, json=payload, timeout=10)
                success = response.status_code < 300

            elif alert.delivery_method == AlertDeliveryMethod.TEAMS:
                # Basic MS Teams Webhook (Connector) implementation
                payload = {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": "0076D7",
                    "summary": alert.message,
                    "sections": [{
                        "activityTitle": f"SynqX Alert: {alert.level.value.upper()}",
                        "activitySubtitle": alert.message,
                        "facts": [
                            {"name": "Pipeline ID", "value": str(alert.pipeline_id)},
                            {"name": "Job ID", "value": str(alert.job_id) if alert.job_id else "N/A"}
                        ],
                        "markdown": True
                    }]
                }
                response = httpx.post(alert.recipient, json=payload, timeout=10)
                success = response.status_code < 300
            
            elif alert.delivery_method == AlertDeliveryMethod.WEBHOOK:
                payload = {
                    "alert_id": alert.id,
                    "level": alert.level.value,
                    "message": alert.message,
                    "pipeline_id": alert.pipeline_id,
                    "job_id": alert.job_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                response = httpx.post(alert.recipient, json=payload, timeout=10)
                success = response.status_code < 300
            
            elif alert.delivery_method == AlertDeliveryMethod.EMAIL:
                import smtplib
                from email.mime.text import MIMEText
                from app.core.config import settings
                
                if not settings.SMTP_USER:
                    logger.warning("SMTP_USER not configured, skipping email delivery")
                    success = False
                else:
                    msg = MIMEText(f"SynqX Alert: {alert.message}\n\nPipeline: {alert.pipeline_id}\nJob: {alert.job_id or 'N/A'}")
                    msg['Subject'] = f"[{alert.level.value.upper()}] SynqX Pipeline Alert"
                    msg['From'] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
                    msg['To'] = alert.recipient
                    
                    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                        if settings.SMTP_TLS:
                            server.starttls()
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                        server.send_message(msg)
                    success = True

            elif alert.delivery_method == AlertDeliveryMethod.PAGERDUTY:
                # PagerDuty Events API v2
                payload = {
                    "routing_key": alert.recipient, # In PagerDuty, this is the Integration Key
                    "event_action": "trigger",
                    "payload": {
                        "summary": alert.message,
                        "severity": "critical" if alert.level.value in ("critical", "error") else "warning",
                        "source": "SynqX ETL",
                        "component": f"Pipeline-{alert.pipeline_id}",
                        "custom_details": {
                            "job_id": alert.job_id,
                            "pipeline_id": alert.pipeline_id
                        }
                    }
                }
                response = httpx.post("https://events.pagerduty.com/v2/enqueue", json=payload, timeout=10)
                success = response.status_code < 300
            
            else:
                success = True 

            if success:
                alert.status = AlertStatus.SENT
            else:
                alert.status = AlertStatus.FAILED
            
            session.commit()

        except Exception as e:
            logger.error(f"Failed to deliver alert {alert_id}: {e}")
            if self.request.retries < self.max_retries:
                raise self.retry(exc=e)
            
            alert.status = AlertStatus.FAILED
            session.commit()


@celery_app.task(
    name="app.worker.tasks.execute_pipeline_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # 1 minute
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,  # 10 minutes max
    retry_jitter=True,
    acks_late=True,  # Task acknowledged after completion
    reject_on_worker_lost=True,
    time_limit=3600,  # 1 hour hard limit
    soft_time_limit=3300,  # 55 minute soft limit
)
def execute_pipeline_task(self, job_id: int) -> str:
    """
    Execute a pipeline job.

    Args:
        job_id: The ID of the job to execute

    Returns:
        Success message

    Raises:
        Exception: If job execution fails after all retries
    """
    logger.info(
        "Pipeline execution task started",
        extra={
            "job_id": job_id,
            "task_id": self.request.id,
            "retries": self.request.retries,
        },
    )

    try:
        with session_scope() as session:
            # Fetch and validate job
            job = session.query(Job).filter(Job.id == job_id).first()
            if not job:
                error_msg = f"Job ID {job_id} not found"
                logger.error(error_msg, extra={"job_id": job_id})
                return error_msg

            # Update job with task ID if not set
            if not job.celery_task_id:
                job.celery_task_id = self.request.id
                session.commit()

            # Check if job is already completed, running or cancelled
            if job.status == JobStatus.SUCCESS:
                logger.warning(
                    f"Job {job_id} already COMPLETED",
                    extra={"job_id": job_id, "status": job.status.value},
                )
                return f"Job {job_id} already {job.status.value}"

            if job.status == JobStatus.CANCELLED:
                logger.warning(
                    f"Job {job_id} already CANCELLED. Skipping execution.",
                    extra={"job_id": job_id},
                )
                return f"Job {job_id} already {job.status.value}"

            if job.status == JobStatus.RUNNING:
                if self.request.retries > 0:
                    logger.warning(
                        f"Job {job_id} found in RUNNING state during retry. Assuming crash recovery.",
                        extra={"job_id": job_id, "retries": self.request.retries},
                    )
                    # Reset status to allow execution to proceed
                    # We don't return here; we let it fall through to "Mark job as running" update below
                else:
                    logger.warning(
                        f"Job {job_id} already RUNNING (no retry)",
                        extra={"job_id": job_id},
                    )
                    return f"Job {job_id} already {job.status.value}"

            # Mark job as running
            job.status = JobStatus.RUNNING
            job.started_at = datetime.now(timezone.utc)
            # Use job.retry_count for manual retries, self.request.retries for celery autoretry
            total_attempts = job.retry_count + self.request.retries + 1
            session.commit()

            # Broadcast global list update
            try:
                from app.core.websockets import manager as ws_manager
                ws_manager.broadcast_sync("jobs_list", {"type": "job_list_update"})
            except Exception as e:
                logger.error(f"Failed to broadcast job start: {e}")

            DBLogger.log_job(
                session,
                job.id,
                "INFO",
                f"Job execution initiated (Attempt {total_attempts})",
                source="worker",
            )
            DBLogger.log_job(session, job.id, "DEBUG", f"Loading pipeline version {job.pipeline_version_id}...", source="worker")

            # Trigger Job Started Alert
            try:
                from app.services.alert_service import AlertService
                from synqx_core.models.enums import AlertType, AlertLevel
                # Use a separate session for alerts to avoid aborting the main transaction on error
                with session_scope() as alert_session:
                    AlertService.trigger_alerts(
                        alert_session,
                        alert_type=AlertType.JOB_STARTED,
                        pipeline_id=job.pipeline_id,
                        job_id=job.id,
                        message=f"Pipeline '{job.pipeline.name if job.pipeline else 'Unknown'}' started (Attempt {total_attempts})",
                        level=AlertLevel.INFO
                    )
            except Exception as alert_err:
                logger.error(f"Failed to create start alerts: {alert_err}")

            # Fetch pipeline version
            pipeline_version = (
                session.query(PipelineVersion)
                .filter(PipelineVersion.id == job.pipeline_version_id)
                .first()
            )

            if not pipeline_version:
                error_msg = f"Pipeline Version ID {job.pipeline_version_id} not found"
                logger.error(error_msg, extra={"job_id": job_id})
                _mark_job_failed(session, job, error_msg, is_infra_error=True)
                return error_msg
            
            pipeline = pipeline_version.pipeline

            # Dynamic Timeout Handling
            if pipeline and pipeline.execution_timeout_seconds:
                # Note: Celery doesn't support changing timeout of a RUNNING task easily 
                # but we can check elapsed time inside the loop or use this info for retries.
                # Here we mainly ensure the task metadata is aware or we log it.
                logger.info(f"Pipeline has execution timeout set to {pipeline.execution_timeout_seconds}s")

            # Validate pipeline version has nodes
            if not pipeline_version.nodes:
                error_msg = "Pipeline version has no nodes"
                logger.error(error_msg, extra={"job_id": job_id})
                _mark_job_failed(session, job, error_msg, is_infra_error=True)
                return error_msg

            # Execute pipeline
            runner = PipelineRunner()

            try:
                logger.info(
                    "Starting pipeline execution",
                    extra={
                        "job_id": job_id,
                        "pipeline_version_id": pipeline_version.id,
                        "node_count": len(pipeline_version.nodes),
                    },
                )

                runner.run(pipeline_version, session, job_id=job.id)

                # MARK AS SUCCESS IMMEDIATELY AFTER RUN
                job.status = JobStatus.SUCCESS
                job.completed_at = datetime.now(timezone.utc)
                
                pipeline_run = session.query(PipelineRun).filter(PipelineRun.job_id == job.id).first()
                if pipeline_run and pipeline_run.duration_seconds is not None:
                    job.execution_time_ms = int(pipeline_run.duration_seconds * 1000)
                else:
                    if job.started_at:
                        duration_seconds = (job.completed_at - job.started_at).total_seconds()
                        job.execution_time_ms = int(duration_seconds * 1000)
                
                session.commit() 

                # Broadcast final job status to UI
                from app.core.websockets import manager
                manager.broadcast_sync(f"job_telemetry:{job.id}", {
                    "type": "job_update",
                    "job_id": job.id,
                    "status": job.status.value,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None
                })
                manager.broadcast_sync("jobs_list", {"type": "job_list_update"})

                # POST-PROCESSING (Alerts, Logs) - Wrap in try/except to not fail the task
                try:
                    from app.services.alert_service import AlertService
                    from synqx_core.models.enums import AlertType, AlertLevel
                    with session_scope() as alert_session:
                        AlertService.trigger_alerts(
                            alert_session,
                            alert_type=AlertType.JOB_SUCCESS,
                            pipeline_id=job.pipeline_id,
                            job_id=job.id,
                            message=f"Pipeline '{pipeline.name}' completed successfully",
                            level=AlertLevel.SUCCESS
                        )
                    DBLogger.log_job(session, job.id, "INFO", "Job processing finalized successfully", source="worker")
                except Exception as post_err:
                    logger.error(f"Post-processing failed but job was successful: {post_err}")

                return f"Job ID {job_id} completed successfully"

            except SoftTimeLimitExceeded:
                error_msg = "Pipeline execution exceeded time limit"
                logger.error(error_msg, extra={"job_id": job_id})
                pipeline_run_in_session = session.query(PipelineRun).filter(PipelineRun.job_id == job_id).first()
                if pipeline_run_in_session:
                    pipeline_run_in_session.status = PipelineRunStatus.FAILED
                    pipeline_run_in_session.completed_at = datetime.now(timezone.utc)
                    pipeline_run_in_session.error_message = error_msg
                _mark_job_failed(session, job, error_msg, is_infra_error=True)
                return error_msg # No retry on soft timeout

            except Exception as e:
                # Catch actual pipeline execution failure
                logger.error(f"Pipeline execution failed: {e}", extra={"job_id": job_id}, exc_info=True)
                
                should_retry = _should_retry_job(job, e, self.request.retries)

                if should_retry and self.request.retries < self.max_retries:
                    _mark_job_retrying(session, job, str(e))
                    DBLogger.log_job(session, job.id, "WARNING", f"Pipeline failed: {str(e)}. Retrying... ({self.request.retries + 1}/{self.max_retries})", source="worker")
                    raise self.retry(exc=e, countdown=_calculate_retry_delay(job, self.request.retries))
                else:
                    _mark_job_failed(session, job, str(e), is_infra_error=False)
                    return f"Job ID {job_id} failed"

    except Retry:
        # Let retry exception propagate
        raise

    except Exception as e:
        logger.error(
            "Unexpected error in execute_pipeline_task",
            extra={"job_id": job_id, "error": str(e)},
            exc_info=True,
        )
        # Attempt to mark the job as failed if it's not already
        with session_scope() as session:
            job = session.query(Job).filter(Job.id == job_id).first()
            if job and job.status not in [JobStatus.SUCCESS, JobStatus.FAILED]:
                _mark_job_failed(session, job, f"Unexpected worker error: {e}", is_infra_error=True)
            # Find the pipeline_run in the session and update it.
            pipeline_run_in_session = (
                session.query(PipelineRun)
                .filter(PipelineRun.job_id == job_id)
                .first()
            )
            if pipeline_run_in_session and pipeline_run_in_session.status not in [PipelineRunStatus.COMPLETED, PipelineRunStatus.FAILED]:
                pipeline_run_in_session.status = PipelineRunStatus.FAILED
                pipeline_run_in_session.completed_at = datetime.now(timezone.utc)
                pipeline_run_in_session.error_message = f"Unexpected worker error: {e}"
                session.add(pipeline_run_in_session)
                session.commit()
        raise


@celery_app.task(
    name="app.worker.tasks.scheduler_heartbeat",
    soft_time_limit=300,  # 5 minutes
    time_limit=360,  # 6 minutes hard limit
)
def scheduler_heartbeat() -> str:
    """
    Check and trigger scheduled pipelines.
    This task should be called periodically (e.g., every minute via Celery Beat).

    Returns:
        Success message with statistics
    """
    logger.info("Scheduler heartbeat started")

    try:
        from app.engine.scheduler import Scheduler

        with session_scope() as session:
            scheduler = Scheduler(session)

            # Track metrics
            start_time = datetime.now(timezone.utc)
            scheduler.check_schedules()
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info(
                "Scheduler heartbeat completed", extra={"duration_seconds": duration}
            )

            return f"Scheduler heartbeat completed in {duration:.2f}s"

    except SoftTimeLimitExceeded:
        logger.error("Scheduler heartbeat exceeded time limit")
        raise

    except Exception as e:
        logger.error(
            "Scheduler heartbeat failed", extra={"error": str(e)}, exc_info=True
        )
        raise


@celery_app.task(
    name="app.worker.tasks.cleanup_old_jobs",
    soft_time_limit=600,  # 10 minutes
)
def cleanup_old_jobs(days_to_keep: int = 30) -> str:
    """
    Clean up old completed jobs and their associated data.

    Args:
        days_to_keep: Number of days of job history to retain

    Returns:
        Success message with cleanup statistics
    """
    logger.info(f"Cleanup task started (keeping {days_to_keep} days)")

    try:
        from sqlalchemy import and_

        with session_scope() as session:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)

            # Count jobs to delete
            old_jobs = (
                session.query(Job)
                .filter(
                    and_(
                        Job.completed_at < cutoff_date,
                        Job.status.in_([JobStatus.SUCCESS, JobStatus.FAILED]),
                    )
                )
                .all()
            )

            job_count = len(old_jobs)

            # Delete associated pipeline runs and step runs (cascade should handle this)
            for job in old_jobs:
                session.delete(job)

            session.commit()

            logger.info(
                f"Cleanup completed: deleted {job_count} old jobs",
                extra={
                    "deleted_count": job_count,
                    "cutoff_date": cutoff_date.isoformat(),
                },
            )

            return f"Cleaned up {job_count} jobs older than {days_to_keep} days"

    except Exception as e:
        logger.error(f"Cleanup task failed: {e}", exc_info=True)
        raise


# Helper functions


def _mark_job_failed(
    session, job: Job, error_message: str, is_infra_error: bool = False
) -> None:
    """Mark a job as failed and log the error."""

    job.status = JobStatus.FAILED
    job.completed_at = datetime.now(timezone.utc)

    # Get the associated PipelineRun to set its duration
    pipeline_run = session.query(PipelineRun).filter(PipelineRun.job_id == job.id).first()
    if pipeline_run:
        if pipeline_run.started_at:
            pipeline_run.duration_seconds = (
                job.completed_at - pipeline_run.started_at
            ).total_seconds()
            job.execution_time_ms = int(pipeline_run.duration_seconds * 1000)
        session.add(pipeline_run) # Persist changes to pipeline_run
    else:
        if job.started_at:
            duration_seconds = (job.completed_at - job.started_at).total_seconds()
            job.execution_time_ms = int(duration_seconds * 1000)

    if is_infra_error:
        job.infra_error = error_message
    else:
        job.infra_error = f"Execution Error: {error_message}"

    session.commit()

    # Broadcast final job status to UI
    from app.core.websockets import manager as ws_manager
    ws_manager.broadcast_sync(f"job_telemetry:{job.id}", {
        "type": "job_update",
        "job_id": job.id,
        "status": job.status.value,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "error_message": error_message
    })
    ws_manager.broadcast_sync("jobs_list", {"type": "job_list_update"})

    # Trigger Alerts based on Config
    try:
        from app.services.alert_service import AlertService
        from synqx_core.models.enums import AlertType, AlertLevel
        
        with session_scope() as alert_session:
            AlertService.trigger_alerts(
                alert_session,
                alert_type=AlertType.JOB_FAILURE,
                pipeline_id=job.pipeline_id,
                job_id=job.id,
                message=error_message,
                level=AlertLevel.ERROR
            )
    except Exception as alert_err:
        logger.error(f"Failed to create alerts: {alert_err}")

    DBLogger.log_job(
        session, job.id, "ERROR", f"Job execution failed: {error_message}", source="worker"
    )


def _mark_job_retrying(session, job: Job, error_message: str) -> None:
    """Mark a job as retrying."""
    job.status = JobStatus.PENDING  # Back to pending for retry
    job.infra_error = f"Retry after error: {error_message}"
    session.commit()

    DBLogger.log_job(
        session,
        job.id,
        "WARNING",
        f"Job will be retried automatically: {error_message}",
        source="worker",
    )


def _should_retry_job(job: Job, error: Exception, retry_count: int) -> bool:
    """
    Determine if a job should be retried based on error type and pipeline configuration.
    """
    # Don't retry certain error types
    non_retryable_errors = (
        ConfigurationError,  # Configuration issues won't be fixed by retrying
        ValueError,  # Invalid data won't be fixed by retrying
        PipelineExecutionError, # Strict validation failures should not be retried
    )

    if isinstance(error, non_retryable_errors):
        logger.info(
            f"Not retrying job {job.id} due to non-retryable error type: {type(error).__name__}"
        )
        return False

    # Check pipeline-specific retry count
    if job.pipeline and job.pipeline.max_retries is not None:
        if retry_count >= job.pipeline.max_retries:
            logger.info(f"Job {job.id} reached max pipeline retries ({job.pipeline.max_retries})")
            return False
    
    # Fallback to job model max_retries if pipeline not loaded or missing attribute
    elif hasattr(job, "max_retries") and job.max_retries is not None:
        if retry_count >= job.max_retries:
            return False

    return True


def _calculate_retry_delay(job: Job, retry_count: int) -> int:
    """
    Calculate retry delay based on the job's pipeline configuration.
    Returns delay in seconds.
    """
    from synqx_core.models.enums import RetryStrategy
    
    # Default values
    base_delay = job.retry_delay_seconds if job.retry_delay_seconds is not None else 60
    strategy = job.retry_strategy if job.retry_strategy is not None else RetryStrategy.FIXED
    
    # If pipeline is loaded, override with its specific config
    if job.pipeline:
        base_delay = job.pipeline.retry_delay_seconds if job.pipeline.retry_delay_seconds is not None else base_delay
        strategy = job.pipeline.retry_strategy if job.pipeline.retry_strategy is not None else strategy

    if strategy == RetryStrategy.FIXED:
        return base_delay
    elif strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
        # 2^retry_count * base_delay, capped at 1 hour
        return min(base_delay * (2 ** retry_count), 3600)
    elif strategy == RetryStrategy.LINEAR_BACKOFF:
        return base_delay * (retry_count + 1)
    
    return base_delay
