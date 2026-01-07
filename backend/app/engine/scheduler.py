import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from croniter import croniter
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from app.models.pipelines import Pipeline
from app.models.monitoring import SchedulerEvent
from app.models.execution import Job
from app.models.enums import JobStatus
from app.worker.tasks import execute_pipeline_task
from app.core.logging import get_logger
from app.utils.agent import is_remote_group

logger = get_logger(__name__)


class SchedulerConfig:
    """Configuration for scheduler behavior."""

    # Maximum number of missed schedules to catch up on
    MAX_CATCHUP_RUNS = 5
    # Time window to look back for missed runs (in seconds)
    CATCHUP_WINDOW_SECONDS = 3600  # 1 hour
    # Whether to skip missed runs or execute them
    SKIP_MISSED_RUNS = False
    # Minimum interval between consecutive runs (in seconds) to prevent rapid firing
    MIN_RUN_INTERVAL_SECONDS = 60


class Scheduler:
    """
    Responsible for checking pipeline schedules and triggering execution.
    Handles missed runs, prevents duplicate triggers, and manages timezone-aware scheduling.
    """

    def __init__(self, db_session: Session, config: Optional[SchedulerConfig] = None):
        self.db_session = db_session
        self.config = config or SchedulerConfig()

    def check_schedules(self) -> None:
        """
        Iterates through all enabled scheduled pipelines and triggers them if due.
        Uses batch processing for better performance.
        """
        logger.info("Scheduler: Checking schedules...")

        # Fetch all scheduled pipelines in one query
        pipelines = self._fetch_scheduled_pipelines()

        if not pipelines:
            logger.debug("No scheduled pipelines found")
            return

        logger.info(f"Found {len(pipelines)} scheduled pipelines to check")

        triggered_count = 0
        error_count = 0

        for pipeline in pipelines:
            try:
                was_triggered = self._process_pipeline_schedule(pipeline)
                if was_triggered:
                    triggered_count += 1
            except Exception as e:
                error_count += 1
                logger.error(
                    f"Error processing schedule for pipeline {pipeline.id}: {e}",
                    exc_info=True,
                    extra={"pipeline_id": pipeline.id},
                )

        logger.info(
            f"Scheduler check complete: {triggered_count} triggered, {error_count} errors"
        )

    def _fetch_scheduled_pipelines(self) -> List[Pipeline]:
        """
        Fetch all pipelines that have scheduling enabled.
        Optimized query with proper filtering.
        """
        return (
            self.db_session.query(Pipeline)
            .filter(
                and_(
                    Pipeline.schedule_enabled,
                    Pipeline.schedule_cron.isnot(None),
                    Pipeline.published_version_id.isnot(
                        None
                    ),  # Only fetch pipelines with published versions
                    Pipeline.deleted_at.is_(None),
                )
            )
            .all()
        )

    def _process_pipeline_schedule(self, pipeline: Pipeline) -> bool:
        """
        Checks if a single pipeline is due for execution.
        Returns True if pipeline was triggered, False otherwise.
        """
        if not pipeline.schedule_cron:
            return False

        if not pipeline.published_version_id:
            logger.warning(
                f"Pipeline {pipeline.id} has no published version. Skipping.",
                extra={"pipeline_id": pipeline.id},
            )
            return False

        now = datetime.now(timezone.utc)
        last_trigger_time = self._get_last_scheduled_trigger_time(pipeline.id)
        
        # Determine the starting point for schedule calculation
        start_search_time = last_trigger_time or self._get_pipeline_start_time(pipeline)
        
        # If the last trigger was very long ago (outside catchup window), 
        # jump forward to the start of the catchup window to avoid getting stuck in the past.
        catchup_limit = now - timedelta(seconds=self.config.CATCHUP_WINDOW_SECONDS)
        if start_search_time < catchup_limit:
            logger.info(
                f"Pipeline {pipeline.id} last run was too long ago. Jumping forward to catchup window.",
                extra={"pipeline_id": pipeline.id, "last_run": start_search_time.isoformat()}
            )
            start_search_time = catchup_limit

        # Check if there's a pending or running job to prevent duplicate triggers
        active_jobs_count = self._get_active_jobs_count(pipeline.id)
        if active_jobs_count >= (pipeline.max_parallel_runs or 1):
            logger.debug(
                f"Pipeline {pipeline.id} has reached max parallel runs ({pipeline.max_parallel_runs}). Skipping trigger.",
                extra={"pipeline_id": pipeline.id, "active_jobs": active_jobs_count},
            )
            return False

        # Calculate due runs
        due_runs = self._calculate_due_runs(
            pipeline.schedule_cron,
            start_search_time,
            now,
        )

        if not due_runs:
            logger.debug(
                f"Pipeline {pipeline.id} not due. Next run: {self._get_next_run_time(pipeline.schedule_cron, now)}",
                extra={"pipeline_id": pipeline.id},
            )
            return False

        # Handle missed runs
        if len(due_runs) > 1:
            logger.warning(
                f"Pipeline {pipeline.id} has {len(due_runs)} missed runs",
                extra={"pipeline_id": pipeline.id, "missed_runs": len(due_runs)},
            )

        # Trigger the appropriate run(s)
        triggered = False
        runs_to_trigger = self._select_runs_to_trigger(due_runs)

        for scheduled_time in runs_to_trigger:
            try:
                self._trigger_scheduled_run(pipeline, scheduled_time)
                triggered = True
                logger.info(
                    f"Triggered pipeline {pipeline.id} for schedule {scheduled_time}",
                    extra={
                        "pipeline_id": pipeline.id,
                        "scheduled_time": scheduled_time.isoformat(),
                    },
                )
            except Exception as e:
                logger.error(
                    f"Failed to trigger pipeline {pipeline.id}: {e}",
                    exc_info=True,
                    extra={"pipeline_id": pipeline.id},
                )

        return triggered

    def _calculate_due_runs(
        self, cron_expression: str, start_time: datetime, now: datetime
    ) -> List[datetime]:
        """
        Calculate all due runs between start_time and now.
        Returns list of scheduled times that should be executed.
        """
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        try:
            cron = croniter(cron_expression, start_time)
            due_runs = []

            # Look for up to MAX_CATCHUP_RUNS missed schedules
            for _ in range(self.config.MAX_CATCHUP_RUNS + 1):
                next_run = cron.get_next(datetime)

                # Stop if next run is in the future
                if next_run > now:
                    break

                # Check if within catchup window
                time_diff = (now - next_run).total_seconds()
                if time_diff > self.config.CATCHUP_WINDOW_SECONDS:
                    logger.debug(
                        f"Skipping run {next_run} as it's outside catchup window "
                        f"({time_diff}s > {self.config.CATCHUP_WINDOW_SECONDS}s)"
                    )
                    continue

                due_runs.append(next_run)

            return due_runs

        except Exception as e:
            logger.error(
                f"Failed to calculate due runs for cron '{cron_expression}': {e}"
            )
            return []

    def _select_runs_to_trigger(self, due_runs: List[datetime]) -> List[datetime]:
        """
        Select which due runs to actually trigger based on configuration.
        """
        if not due_runs:
            return []

        if self.config.SKIP_MISSED_RUNS:
            # Only trigger the most recent due run
            return [due_runs[-1]]

        # Trigger all due runs up to MAX_CATCHUP_RUNS
        return due_runs[: self.config.MAX_CATCHUP_RUNS]

    def _get_next_run_time(
        self, cron_expression: str, from_time: datetime
    ) -> Optional[datetime]:
        """Calculate the next run time for logging purposes."""
        try:
            if from_time.tzinfo is None:
                from_time = from_time.replace(tzinfo=timezone.utc)
            cron = croniter(cron_expression, from_time)
            return cron.get_next(datetime)
        except Exception:
            return None

    def _get_last_scheduled_trigger_time(self, pipeline_id: int) -> Optional[datetime]:
        """
        Retrieves the timestamp of the last scheduled trigger event.
        Uses the event timestamp to prevent double-triggering.
        """
        last_event = (
            self.db_session.query(SchedulerEvent)
            .filter(
                and_(
                    SchedulerEvent.pipeline_id == pipeline_id,
                    SchedulerEvent.event_type == "TRIGGER",
                )
            )
            .order_by(desc(SchedulerEvent.timestamp))
            .first()
        )

        if last_event and last_event.timestamp:
            # Ensure timezone awareness
            if last_event.timestamp.tzinfo is None:
                return last_event.timestamp.replace(tzinfo=timezone.utc)
            return last_event.timestamp

        return None

    def _get_pipeline_start_time(self, pipeline: Pipeline) -> datetime:
        """
        Get the effective start time for schedule calculations.
        Uses pipeline creation time or current time as fallback.
        """
        start_time = pipeline.created_at or datetime.now(timezone.utc)

        # Ensure timezone awareness
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        return start_time

    def _get_active_jobs_count(self, pipeline_id: int) -> int:
        """
        Get the count of pending or running jobs for a pipeline.
        Used to enforce concurrency limits.
        Ignores 'stale' jobs that have been stuck for too long.
        """
        now = datetime.now(timezone.utc)
        stale_threshold = now - timedelta(hours=2) # Consider jobs stuck for > 2h as stale
        
        return (
            self.db_session.query(Job)
            .filter(
                and_(
                    Job.pipeline_id == pipeline_id,
                    Job.status.in_([JobStatus.PENDING, JobStatus.RUNNING]),
                    # Only count jobs that are not stale
                    Job.created_at > stale_threshold
                )
            )
            .count()
        )

    def _trigger_scheduled_run(
        self, pipeline: Pipeline, scheduled_time: datetime
    ) -> None:
        """
        Triggers the pipeline run and records the scheduler event.
        Uses a transaction to ensure atomicity.
        """
        now = datetime.now(timezone.utc)

        # Validate minimum interval since last trigger
        last_trigger = self._get_last_scheduled_trigger_time(pipeline.id)
        if last_trigger:
            seconds_since_last = (now - last_trigger).total_seconds()
            if seconds_since_last < self.config.MIN_RUN_INTERVAL_SECONDS:
                logger.warning(
                    f"Skipping trigger for pipeline {pipeline.id}: "
                    f"too soon since last run ({seconds_since_last}s < {self.config.MIN_RUN_INTERVAL_SECONDS}s)",
                    extra={"pipeline_id": pipeline.id},
                )
                return

        try:
            # 1. Create Scheduler Event
            event = SchedulerEvent(
                pipeline_id=pipeline.id,
                workspace_id=pipeline.workspace_id,
                event_type="TRIGGER",
                timestamp=now,  # Use actual trigger time to prevent drift
                cron_expression=pipeline.schedule_cron,
                reason=f"Scheduled execution (due: {scheduled_time.isoformat()})",
            )
            self.db_session.add(event)

            # 2. Create Job
            job = Job(
                pipeline_id=pipeline.id,
                workspace_id=pipeline.workspace_id,
                pipeline_version_id=pipeline.published_version_id,
                correlation_id=str(uuid.uuid4()),
                status=JobStatus.PENDING,
                retry_strategy=getattr(pipeline, "retry_strategy", None),
            )
            self.db_session.add(job)
            self.db_session.flush()  # Get job.id before enqueueing

            # Check for Remote Agent Routing
            if is_remote_group(pipeline.agent_group):
                from app.services.agent_service import AgentService
                if not AgentService.is_group_active(self.db_session, pipeline.workspace_id, pipeline.agent_group):
                    logger.error(
                        f"Skipping scheduled run for pipeline {pipeline.id}: No active agents in group '{pipeline.agent_group}'",
                        extra={"pipeline_id": pipeline.id, "agent_group": pipeline.agent_group}
                    )
                    # Log a specific event for the user to see in history
                    error_event = SchedulerEvent(
                        pipeline_id=pipeline.id,
                        workspace_id=pipeline.workspace_id,
                        event_type="ERROR",
                        timestamp=now,
                        cron_expression=pipeline.schedule_cron,
                        reason=f"Failed to trigger: No active agents in group '{pipeline.agent_group}'",
                    )
                    self.db_session.add(error_event)
                    self.db_session.commit()
                    return

                # Mark as queued for remote agent
                job.status = JobStatus.QUEUED
                job.queue_name = pipeline.agent_group
                self.db_session.commit()
                
                logger.info(
                    f"Automated run for Pipeline #{pipeline.id} queued for remote agent group '{pipeline.agent_group}'.",
                    extra={
                        "pipeline_id": pipeline.id,
                        "job_id": job.id,
                        "agent_group": pipeline.agent_group
                    },
                )
                return

            # 3. Enqueue Celery Task
            task = execute_pipeline_task.apply_async(
                args=[job.id],
                countdown=0,  # Execute immediately
                task_id=str(uuid.uuid4()),  # Explicit task ID for tracking
            )

            job.celery_task_id = task.id
            self.db_session.commit()

            logger.info(
                f"Successfully triggered automated execution for Pipeline #{pipeline.id} (Job #{job.id}).",
                extra={
                    "pipeline_id": pipeline.id,
                    "job_id": job.id,
                    "task_id": task.id,
                    "scheduled_time": scheduled_time.isoformat(),
                },
            )

        except Exception as e:
            logger.error(
                f"Automated trigger failed for Pipeline #{pipeline.id}: {e}",
                exc_info=True,
                extra={"pipeline_id": pipeline.id},
            )
            self.db_session.rollback()
            raise

    def get_pipeline_next_run(self, pipeline_id: int) -> Optional[datetime]:
        """
        Public method to get the next scheduled run time for a pipeline.
        Useful for UI display.
        """
        pipeline = (
            self.db_session.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        )

        if not pipeline or not pipeline.schedule_cron or not pipeline.schedule_enabled:
            return None

        now = datetime.now(timezone.utc)
        return self._get_next_run_time(pipeline.schedule_cron, now)

    def validate_cron_expression(
        self, cron_expression: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate a cron expression.
        Returns (is_valid, error_message).
        """
        try:
            # Test with current time
            cron = croniter(cron_expression, datetime.now(timezone.utc))
            # Try to get next run to ensure it's valid
            cron.get_next(datetime)
            return True, None
        except Exception as e:
            return False, str(e)
