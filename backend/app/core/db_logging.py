import json
from datetime import UTC, datetime
from typing import Any

import redis
from sqlalchemy.orm import Session
from synqx_core.models.monitoring import JobLog, StepLog

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize Redis client for publishing events
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


class DBLogger:
    """
    Helper class to write logs to the database for Jobs and Steps.
    Uses the existing SQLAlchemy session.
    """

    @staticmethod
    def log_job(  # noqa: PLR0913
        session: Session,
        job_id: int,
        level: str,
        message: str,
        metadata: dict[str, Any] | None = None,
        source: str = "system",
        timestamp: datetime | None = None,
    ):
        """
        Writes a log entry to the job_logs table.
        """
        try:
            timestamp = timestamp or datetime.now(UTC)
            log_id = None

            # Fetch workspace_id from job
            from synqx_core.models.execution import Job  # noqa: PLC0415

            job = session.query(Job).filter(Job.id == job_id).first()
            workspace_id = job.workspace_id if job else None

            # Use a savepoint to ensure log failures don't abort the main transaction
            with session.begin_nested():
                log_entry = JobLog(
                    job_id=job_id,
                    workspace_id=workspace_id,
                    level=level.upper(),
                    message=message,
                    metadata_payload=metadata,
                    timestamp=timestamp,
                    source=source,
                )
                session.add(log_entry)
                session.flush()  # Flush to assign ID
                log_id = log_entry.id

            # Publish to Redis channel
            payload = {
                "type": "job_log",
                "id": log_id,
                "job_id": job_id,
                "workspace_id": workspace_id,
                "level": level.upper(),
                "message": message,
                "timestamp": timestamp.isoformat(),
                "source": source,
            }
            redis_client.publish(f"job:{job_id}", json.dumps(payload))
            if workspace_id:
                redis_client.publish(
                    f"workspace_logs:{workspace_id}", json.dumps(payload)
                )

        except Exception as e:
            # Fallback to standard logger if DB write fails, to ensure we don't lose the error  # noqa: E501
            logger.error(f"Failed to write JobLog (Job {job_id}): {e}")

    @staticmethod
    def log_step(  # noqa: PLR0913
        session: Session,
        step_run_id: int,
        level: str,
        message: str,
        metadata: dict[str, Any] | None = None,
        source: str = "runner",
        job_id: int | None = None,
        timestamp: datetime | None = None,
    ):
        """
        Writes a log entry to the step_logs table.
        """
        try:
            timestamp = timestamp or datetime.now(UTC)
            log_id = None

            from synqx_core.models.execution import (  # noqa: PLC0415
                Job,
                PipelineRun,
                StepRun,
            )

            # Efficient lookup for workspace_id
            workspace_id = None
            if job_id:
                job = session.query(Job).filter(Job.id == job_id).first()
                workspace_id = job.workspace_id if job else None
            else:
                result = (
                    session.query(PipelineRun.workspace_id, PipelineRun.job_id)
                    .join(StepRun, StepRun.pipeline_run_id == PipelineRun.id)
                    .filter(StepRun.id == step_run_id)
                    .first()
                )
                if result:
                    workspace_id = result.workspace_id
                    job_id = result.job_id

            with session.begin_nested():
                log_entry = StepLog(
                    step_run_id=step_run_id,
                    workspace_id=workspace_id,
                    level=level.upper(),
                    message=message,
                    metadata_payload=metadata,
                    timestamp=timestamp,
                    source=source,
                )
                session.add(log_entry)
                session.flush()
                log_id = log_entry.id

            # Publish to Step Redis channel
            payload = {
                "type": "step_log",
                "id": log_id,
                "step_run_id": step_run_id,
                "workspace_id": workspace_id,
                "level": level.upper(),
                "message": message,
                "timestamp": timestamp.isoformat(),
                "source": source,
            }
            redis_client.publish(f"step:{step_run_id}", json.dumps(payload))

            # Publish to Job Redis channel (for unified view)
            if job_id:
                job_payload = {
                    "type": "step_log",
                    "id": log_id,
                    "level": level.upper(),
                    "message": message,
                    "timestamp": timestamp.isoformat(),
                    "source": source,
                    "step_run_id": step_run_id,
                    "job_id": job_id,
                    "workspace_id": workspace_id,
                }
                redis_client.publish(f"job:{job_id}", json.dumps(job_payload))
                if workspace_id:
                    redis_client.publish(
                        f"workspace_logs:{workspace_id}", json.dumps(job_payload)
                    )

        except Exception as e:
            logger.error(f"Failed to write StepLog (StepRun {step_run_id}): {e}")

        except Exception as e:  # noqa: B025
            logger.error(f"Failed to write StepLog (StepRun {step_run_id}): {e}")
