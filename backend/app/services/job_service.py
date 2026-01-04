from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.execution import Job, PipelineRun, StepRun
from app.models.monitoring import JobLog, StepLog
from app.models.enums import JobStatus, PipelineRunStatus
from app.core.errors import AppError
from app.core.logging import get_logger
from app.worker.tasks import execute_pipeline_task

logger = get_logger(__name__)


class JobService:

    def __init__(self, db_session: Session):
        self.db_session = db_session

    def get_job(self, job_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Optional[Job]:
        """Get job by ID, scoped to a user or workspace."""
        query = self.db_session.query(Job).filter(Job.id == job_id)
        if workspace_id:
            query = query.filter(Job.workspace_id == workspace_id)
        elif user_id:
            query = query.filter(Job.user_id == user_id)
        return query.first()

    def list_jobs(
        self,
        user_id: int,
        workspace_id: Optional[int] = None,
        pipeline_id: Optional[int] = None,
        status: Optional[JobStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Job], int]:
        """List jobs scoped by user or workspace with optional filtering."""
        if workspace_id:
            query = self.db_session.query(Job).filter(Job.workspace_id == workspace_id)
        else:
            query = self.db_session.query(Job).filter(Job.user_id == user_id)

        if pipeline_id:
            query = query.filter(Job.pipeline_id == pipeline_id)

        if status:
            query = query.filter(Job.status == status)

        total = query.count()
        jobs = query.order_by(desc(Job.created_at)).limit(limit).offset(offset).all()

        return jobs, total
    def cancel_job(self, job_id: int, user_id: int, workspace_id: Optional[int] = None, reason: Optional[str] = None) -> Job:
        """Cancel a running or pending job for a specific user."""
        job = self.get_job(job_id, user_id=user_id, workspace_id=workspace_id)

        if not job:
            raise AppError(f"Job {job_id} not found")

        if job.status not in [JobStatus.PENDING, JobStatus.RUNNING, JobStatus.QUEUED]:
            raise AppError(f"Cannot cancel job in status {job.status.value}")

        try:
            if job.celery_task_id:
                from celery.result import AsyncResult
                from app.core.celery_app import celery_app

                task = AsyncResult(job.celery_task_id, app=celery_app)
                task.revoke(terminate=True)

            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now(timezone.utc)
            if job.started_at:
                duration_ms = int(
                    (job.completed_at - job.started_at).total_seconds() * 1000
                )
                job.execution_time_ms = duration_ms

            # Update associated PipelineRun and StepRuns
            pipeline_run = self.db_session.query(PipelineRun).filter(PipelineRun.job_id == job_id).first()
            if pipeline_run:
                pipeline_run.status = PipelineRunStatus.CANCELLED
                pipeline_run.completed_at = datetime.now(timezone.utc)
                pipeline_run.error_message = f"Cancelled: {reason}" if reason else "Cancelled by user"
                
                # Also cancel active step runs
                from app.models.enums import OperatorRunStatus
                active_steps = self.db_session.query(StepRun).filter(
                    StepRun.pipeline_run_id == pipeline_run.id,
                    StepRun.status == OperatorRunStatus.RUNNING
                ).all()
                for step in active_steps:
                    step.status = OperatorRunStatus.FAILED
                    step.completed_at = datetime.now(timezone.utc)
                    step.error_message = "Cancelled due to job cancellation"

            if reason:
                job.infra_error = f"Cancelled: {reason}"

            self.db_session.commit()

            logger.info(
                f"Job {job_id} cancelled", extra={"job_id": job_id, "reason": reason, "user_id": user_id}
            )

            return job

        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to cancel job {job_id}: {e}")
            raise AppError(f"Failed to cancel job: {e}")

    def retry_job(self, job_id: int, user_id: int, workspace_id: Optional[int] = None, force: bool = False) -> Job:
        """Retry a failed job for a specific user."""
        job = self.get_job(job_id, user_id=user_id, workspace_id=workspace_id)

        if not job:
            raise AppError(f"Job {job_id} not found")

        if job.status not in [JobStatus.FAILED, JobStatus.CANCELLED]:
            raise AppError(
                f"Can only retry failed or cancelled jobs. Current status: {job.status.value}"
            )

        if not force and job.retry_count >= job.max_retries:
            raise AppError(
                f"Job has reached max retries ({job.max_retries}). Use force=true to override."
            )

        try:
            new_job = Job(
                pipeline_id=job.pipeline_id,
                pipeline_version_id=job.pipeline_version_id,
                user_id=user_id,
                workspace_id=workspace_id or job.workspace_id,
                correlation_id=job.correlation_id,
                status=JobStatus.PENDING,
                retry_count=job.retry_count + 1,
                max_retries=job.max_retries,
                retry_strategy=job.retry_strategy,
                retry_delay_seconds=job.retry_delay_seconds,
            )

            self.db_session.add(new_job)
            self.db_session.flush()

            # Prepare retried job
            if job.pipeline and job.pipeline.agent_group and job.pipeline.agent_group != "internal":
                # Mark as queued for remote agent
                new_job.status = JobStatus.QUEUED
                new_job.queue_name = job.pipeline.agent_group
                self.db_session.commit()
                
                logger.info(
                    f"Job {job_id} retried and queued for remote agent group '{job.pipeline.agent_group}'",
                    extra={"job_id": job_id, "new_job_id": new_job.id}
                )
            else:
                task = execute_pipeline_task.delay(new_job.id)
                new_job.celery_task_id = task.id
                self.db_session.commit()

                logger.info(
                    f"Job {job_id} retried as job {new_job.id}",
                    extra={"original_job_id": job_id, "new_job_id": new_job.id, "user_id": user_id},
                )

            return new_job

        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to retry job {job_id}: {e}")
            raise AppError(f"Failed to retry job: {str(e)}")

        except Exception as e:
            self.db_session.rollback()
            logger.error(f"Failed to retry job {job_id}: {e}")
            raise AppError(f"Failed to retry job: {e}")

    def get_job_logs(self, job_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None, level: Optional[str] = None) -> List[dict]:
        """Get logs for a specific job and all its retry attempts (via correlation_id)."""
        # Fetch the job to get its correlation_id
        job = self.get_job(job_id, user_id=user_id, workspace_id=workspace_id)
        if not job:
            return []
            
        correlation_id = job.correlation_id

        # 1. Fetch Job Logs for ALL jobs with the same correlation_id
        job_logs_query = (
            self.db_session.query(JobLog)
            .join(Job, JobLog.job_id == Job.id)
            .filter(Job.correlation_id == correlation_id)
        )
        if level:
            job_logs_query = job_logs_query.filter(JobLog.level == level)
        job_logs = job_logs_query.all()

        # 2. Fetch Step Logs associated with all runs of this job (via correlation_id)
        step_logs_query = (
            self.db_session.query(StepLog)
            .join(StepRun, StepLog.step_run_id == StepRun.id)
            .join(PipelineRun, StepRun.pipeline_run_id == PipelineRun.id)
            .join(Job, PipelineRun.job_id == Job.id)
            .filter(Job.correlation_id == correlation_id)
        )
        if level:
            step_logs_query = step_logs_query.filter(StepLog.level == level)
        step_logs = step_logs_query.all()

        # 3. Combine and Format
        unified_logs = []
        
        for log in job_logs:
            unified_logs.append({
                "id": log.id,
                "level": log.level,
                "message": log.message,
                "metadata_payload": log.metadata_payload,
                "timestamp": log.timestamp,
                "source": log.source,
                "job_id": log.job_id,
                "type": "job_log"
            })
            
        for log in step_logs:
            unified_logs.append({
                "id": log.id,
                "level": log.level,
                "message": log.message,
                "metadata_payload": log.metadata_payload,
                "timestamp": log.timestamp,
                "source": log.source,
                "step_run_id": log.step_run_id,
                "type": "step_log"
            })

        # 4. Sort by timestamp to preserve chronological order across attempts
        unified_logs.sort(key=lambda x: x["timestamp"])
        
        return unified_logs


class PipelineRunService:

    def __init__(self, db_session: Session):
        self.db_session = db_session

    def get_run(self, run_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> Optional[PipelineRun]:
        """Get pipeline run by ID, scoped to a user or workspace."""
        query = self.db_session.query(PipelineRun).filter(PipelineRun.id == run_id)
        if workspace_id:
            query = query.filter(PipelineRun.workspace_id == workspace_id)
        elif user_id:
            query = query.filter(PipelineRun.user_id == user_id)
        return query.first()

    def list_runs(
        self,
        user_id: int,
        workspace_id: Optional[int] = None,
        pipeline_id: Optional[int] = None,
        status: Optional[PipelineRunStatus] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[PipelineRun], int]:
        """List runs scoped by user or workspace with optional filtering."""
        if workspace_id:
            query = self.db_session.query(PipelineRun).filter(PipelineRun.workspace_id == workspace_id)
        else:
            query = self.db_session.query(PipelineRun).filter(PipelineRun.user_id == user_id)

        if pipeline_id:
            query = query.filter(PipelineRun.pipeline_id == pipeline_id)

        if status:
            query = query.filter(PipelineRun.status == status)

        total = query.count()
        runs = (
            query.order_by(desc(PipelineRun.created_at))
            .limit(limit)
            .offset(offset)
            .all()
        )

        return runs, total

    def get_run_steps(self, run_id: int, user_id: Optional[int] = None, workspace_id: Optional[int] = None) -> List[StepRun]:
        """Get all step runs for a pipeline run, optionally scoped to user."""
        from sqlalchemy.orm import joinedload
        run = self.get_run(run_id, user_id=user_id, workspace_id=workspace_id)

        if not run:
            raise AppError(f"Pipeline run {run_id} not found")

        return (
            self.db_session.query(StepRun)
            .options(joinedload(StepRun.node))
            .filter(StepRun.pipeline_run_id == run_id)
            .order_by(StepRun.order_index)
            .all()
        )

    def get_step_logs(
        self, step_run_id: int, user_id: int, workspace_id: Optional[int] = None, level: Optional[str] = None
    ) -> List[StepLog]:
        """Get logs for a specific step run, scoped to user or workspace."""
        # Check ownership via join
        query = self.db_session.query(StepLog).join(
            StepRun, StepLog.step_run_id == StepRun.id
        ).join(
            PipelineRun, StepRun.pipeline_run_id == PipelineRun.id
        ).filter(
            StepLog.step_run_id == step_run_id
        )

        if workspace_id:
            query = query.filter(PipelineRun.workspace_id == workspace_id)
        else:
            query = query.filter(PipelineRun.user_id == user_id)

        if level:
            query = query.filter(StepLog.level == level)

        return query.order_by(StepLog.timestamp).all()

    def get_run_metrics(self, pipeline_id: int, user_id: int, workspace_id: Optional[int] = None) -> dict:
        """Get aggregated metrics for a pipeline's runs, scoped to user or workspace."""
        # Ensure pipeline belongs to user/workspace
        from app.models.pipelines import Pipeline
        query = self.db_session.query(Pipeline).filter(Pipeline.id == pipeline_id)
        if workspace_id:
            query = query.filter(Pipeline.workspace_id == workspace_id)
        else:
            query = query.filter(Pipeline.user_id == user_id)
            
        pipeline_exists = query.first()
        
        if not pipeline_exists:
            raise AppError("Pipeline not found")

        base_run_query = self.db_session.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id)
        if workspace_id:
            base_run_query = base_run_query.filter(PipelineRun.workspace_id == workspace_id)
        else:
            base_run_query = base_run_query.filter(PipelineRun.user_id == user_id)

        total_runs = (
            self.db_session.query(func.count(PipelineRun.id))
            .filter(PipelineRun.id.in_(base_run_query.with_entities(PipelineRun.id)))
            .scalar()
            or 0
        )

        successful_runs = (
            self.db_session.query(func.count(PipelineRun.id))
            .filter(
                PipelineRun.id.in_(base_run_query.with_entities(PipelineRun.id)),
                PipelineRun.status == PipelineRunStatus.COMPLETED,
            )
            .scalar()
            or 0
        )

        failed_runs = (
            self.db_session.query(func.count(PipelineRun.id))
            .filter(
                PipelineRun.id.in_(base_run_query.with_entities(PipelineRun.id)),
                PipelineRun.status == PipelineRunStatus.FAILED,
            )
            .scalar()
            or 0
        )

        avg_duration = (
            self.db_session.query(func.avg(PipelineRun.duration_seconds))
            .filter(
                PipelineRun.id.in_(base_run_query.with_entities(PipelineRun.id)),
                PipelineRun.status == PipelineRunStatus.COMPLETED,
                PipelineRun.duration_seconds.isnot(None),
            )
            .scalar()
        )

        total_records = (
            self.db_session.query(func.sum(PipelineRun.total_loaded))
            .filter(PipelineRun.id.in_(base_run_query.with_entities(PipelineRun.id)))
            .scalar()
            or 0
        )

        total_quarantined = (
            self.db_session.query(func.sum(StepRun.records_error))
            .filter(StepRun.pipeline_run_id.in_(base_run_query.with_entities(PipelineRun.id)))
            .scalar()
            or 0
        )

        return {
            "total_runs": total_runs,
            "successful_runs": successful_runs,
            "failed_runs": failed_runs,
            "success_rate": round(
                (successful_runs / total_runs * 100) if total_runs > 0 else 0, 2
            ),
            "average_duration_seconds": float(avg_duration) if avg_duration else None,
            "total_records_processed": total_records,
            "total_quarantined": int(total_quarantined)
        }
