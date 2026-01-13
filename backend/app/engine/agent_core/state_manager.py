"""
=================================================================================
FILE 6: state_manager.py - Enhanced State Manager with Real-time Telemetry
=================================================================================
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import SessionLocal
from synqx_core.models.execution import StepRun, PipelineRun
from synqx_core.models.enums import OperatorRunStatus, PipelineRunStatus, OperatorType
from app.core.db_logging import DBLogger
from app.core.logging import get_logger
from app.core.websockets import manager
from app.utils.serialization import sanitize_for_json

logger = get_logger(__name__)


class StateManager:
    """
    Manages pipeline and step run state with real-time telemetry broadcasting.
    
    Features:
    - Thread-safe state updates
    - Real-time WebSocket telemetry
    - Comprehensive metrics tracking
    - Automatic duration calculation
    - Retry support
    - Error tracking
    """
    
    def __init__(self, db: Session, job_id: int):
        self.db = db
        self.job_id = job_id
    
    def _broadcast_telemetry(self, data: dict):
        """
        Broadcast telemetry data via WebSocket.
        Handles sync/async context gracefully.
        """
        try:
            manager.broadcast_sync(f"job_telemetry:{self.job_id}", data)
        except Exception as e:
            logger.debug(f"Telemetry broadcast failed (non-critical): {e}")
    
    def initialize_run(
        self,
        pipeline_id: int,
        version_id: int,
        total_nodes: int = 0
    ) -> PipelineRun:
        """
        Initialize or reset pipeline run for execution.
        
        Supports retry scenarios by resetting existing runs.
        """
        pipeline_run = self.db.query(PipelineRun).filter(
            PipelineRun.job_id == self.job_id
        ).first()
        
        if pipeline_run:
            # Reset existing run for retry
            logger.info(f"Resetting existing pipeline run {pipeline_run.id} for retry")
            
            pipeline_run.status = PipelineRunStatus.RUNNING
            pipeline_run.total_nodes = total_nodes
            pipeline_run.started_at = datetime.now(timezone.utc)
            pipeline_run.completed_at = None
            pipeline_run.error_message = None
            
            # Reset all step runs
            for step in pipeline_run.step_runs:
                step.status = OperatorRunStatus.PENDING
                step.records_in = step.records_out = step.bytes_processed = 0
                step.records_filtered = step.records_error = 0
                step.duration_seconds = 0
                step.retry_count = 0
                step.error_message = None
                step.error_type = None
                step.started_at = None
                step.completed_at = None
        
        else:
            # Create new run
            max_run = (
                self.db.query(func.max(PipelineRun.run_number))
                .filter(PipelineRun.pipeline_id == pipeline_id)
                .scalar()
            ) or 0
            
            # Fetch job to get user_id
            from synqx_core.models.execution import Job
            job = self.db.query(Job).filter(Job.id == self.job_id).first()
            if not job:
                raise Exception(f"Job {self.job_id} not found during run initialization")

            pipeline_run = PipelineRun(
                job_id=self.job_id,
                pipeline_id=pipeline_id,
                user_id=job.user_id,
                workspace_id=job.workspace_id,
                pipeline_version_id=version_id,
                run_number=max_run + 1,
                status=PipelineRunStatus.RUNNING,
                total_nodes=total_nodes,
                started_at=datetime.now(timezone.utc)
            )
            self.db.add(pipeline_run)
            
            logger.info(
                f"Created new pipeline run {max_run + 1} for pipeline {pipeline_id}"
            )
        
        self.db.commit()
        self.db.refresh(pipeline_run)
        
        DBLogger.log_job(
            self.db, self.job_id, "INFO",
            f"Pipeline run initialized. Run number: {pipeline_run.run_number} | Stage count: {total_nodes}."
        )
        
        # Broadcast initial state
        self._broadcast_telemetry({
            "type": "run_started",
            "run_id": pipeline_run.id,
            "run_number": pipeline_run.run_number,
            "pipeline_id": pipeline_id,
            "total_nodes": total_nodes,
            "started_at": pipeline_run.started_at.isoformat()
        })
        
        return pipeline_run
    
    def create_step_run(
        self,
        pipeline_run_id: int,
        node_id: int,
        operator_type: str,
        order_index: int
    ) -> StepRun:
        """Create a new step run for a node"""
        step_run = StepRun(
            pipeline_run_id=pipeline_run_id,
            node_id=node_id,
            operator_type=operator_type,
            order_index=order_index,
            status=OperatorRunStatus.PENDING,
            started_at=datetime.now(timezone.utc),
            records_in=0,
            records_out=0,
            records_filtered=0,
            records_error=0,
            bytes_processed=0,
            retry_count=0
        )
        
        self.db.add(step_run)
        self.db.commit()
        self.db.refresh(step_run)
        
        logger.debug(f"Created step run {step_run.id} for node {node_id}")
        
        return step_run
    
    def update_step_status(
        self,
        step_run: StepRun,
        status: OperatorRunStatus,
        records_in: int = 0,
        records_out: int = 0,
        records_filtered: int = 0,
        records_error: int = 0,
        bytes_processed: int = 0,
        retry_count: int = 0,
        cpu_percent: Optional[float] = None,
        memory_mb: Optional[float] = None,
        sample_data: Optional[dict] = None,
        quality_profile: Optional[dict] = None,
        lineage_map: Optional[dict] = None,
        error: Optional[Exception] = None
    ):
        """
        Update step run status with comprehensive metrics.
        """
        try:
            logger.debug(f"Updating step {step_run.id}: IN={records_in}, OUT={records_out}, ERR={records_error}")
            # Re-fetch to ensure we are in the current session
            t_step_run = self.db.query(StepRun).filter(
                StepRun.id == step_run.id
            ).first()
            
            if not t_step_run:
                logger.warning(f"Step run {step_run.id} not found for update")
                return
            
            # Update status
            t_step_run.status = status
            
            # Update timing
            if status == OperatorRunStatus.RUNNING and not t_step_run.started_at:
                t_step_run.started_at = datetime.now(timezone.utc)
            
            if status in [OperatorRunStatus.SUCCESS, OperatorRunStatus.FAILED]:
                t_step_run.completed_at = datetime.now(timezone.utc)
                if t_step_run.started_at:
                    duration = (
                        t_step_run.completed_at - t_step_run.started_at
                    ).total_seconds()
                    t_step_run.duration_seconds = duration
            
            # Update metrics
            t_step_run.records_in = records_in
            t_step_run.records_out = records_out
            t_step_run.records_filtered = records_filtered
            t_step_run.records_error = records_error
            t_step_run.bytes_processed = bytes_processed
            t_step_run.retry_count = retry_count
            
            # Update resource usage
            if cpu_percent is not None:
                t_step_run.cpu_percent = cpu_percent
            if memory_mb is not None:
                t_step_run.memory_mb = memory_mb
            
            # Update sample data
            if sample_data is not None:
                t_step_run.sample_data = sanitize_for_json(sample_data)
            
            # Update quality profile
            if quality_profile is not None:
                t_step_run.quality_profile = sanitize_for_json(quality_profile)
            
            # Update lineage
            if lineage_map is not None:
                t_step_run.lineage_map = sanitize_for_json(lineage_map)
            
            # Update error info
            if error:
                t_step_run.error_message = str(error)
                t_step_run.error_type = type(error).__name__
            
            self.db.add(t_step_run)
            
            # PERFORMANCE OPTIMIZATION:
            # Only recalculate pipeline aggregates on terminal states (Success/Failure)
            # and NOT on every progress/running update.
            is_terminal = status in [OperatorRunStatus.SUCCESS, OperatorRunStatus.FAILED]
            
            if is_terminal:
                self.db.flush() # Ensure t_step_run is written before aggregation
                
                # Re-fetch pipeline run to compute aggregates accurately
                t_pipeline_run = self.db.query(PipelineRun).filter(
                    PipelineRun.id == t_step_run.pipeline_run_id
                ).first()
                
                if t_pipeline_run:
                    # Fetch fresh step runs to avoid stale relationship data
                    fresh_steps = self.db.query(StepRun).filter(StepRun.pipeline_run_id == t_pipeline_run.id).all()
                    
                    # Aggregate metrics
                    total_extracted = sum(s.records_out for s in fresh_steps if s.operator_type == OperatorType.EXTRACT)
                    total_loaded = sum(s.records_out for s in fresh_steps if s.operator_type == OperatorType.LOAD)
                    total_failed = sum(s.records_error for s in fresh_steps)
                    total_bytes = sum(s.bytes_processed for s in fresh_steps)
                    
                    completed_steps = len([s for s in fresh_steps if s.status == OperatorRunStatus.SUCCESS])
                    failed_steps = len([s for s in fresh_steps if s.status == OperatorRunStatus.FAILED])
                    
                    t_pipeline_run.total_extracted = total_extracted
                    t_pipeline_run.total_loaded = total_loaded
                    t_pipeline_run.total_failed = total_failed
                    t_pipeline_run.bytes_processed = total_bytes
                    
                    self.db.add(t_pipeline_run)

            # Final commit for all changes
            self.db.commit()
            
            # Broadcast telemetry (includes aggregates if they were updated)
            telemetry_payload = {
                "type": "step_update",
                "step_run_id": t_step_run.id,
                "node_id": t_step_run.node_id,
                "status": status.value,
                "records_in": records_in,
                "records_out": records_out,
                "records_filtered": records_filtered,
                "records_error": records_error,
                "bytes_processed": bytes_processed,
                "cpu_percent": cpu_percent,
                "memory_mb": memory_mb,
                "quality_profile": quality_profile,
                "completed_at": t_step_run.completed_at.isoformat() if t_step_run.completed_at else None,
                "duration_seconds": t_step_run.duration_seconds
            }

            if is_terminal and t_pipeline_run:
                telemetry_payload.update({
                    "total_extracted": total_extracted,
                    "total_loaded": total_loaded,
                    "total_failed": total_failed,
                    "total_nodes": t_pipeline_run.total_nodes,
                    "completed_steps": completed_steps,
                    "failed_steps": failed_steps,
                    "progress_pct": (completed_steps / t_pipeline_run.total_nodes * 100) if t_pipeline_run.total_nodes > 0 else 0
                })
            
            self._broadcast_telemetry(telemetry_payload)
        
        except Exception as e:
            logger.error(f"Failed to update step status: {e}", exc_info=True)
            self.db.rollback()

    def complete_run(self, pipeline_run: PipelineRun):
        """Mark pipeline run as completed successfully"""
        try:
            self.db.expire_all()
            t_run = self.db.query(PipelineRun).filter(PipelineRun.id == pipeline_run.id).first()
            
            if not t_run:
                return
            
            t_run.status = PipelineRunStatus.COMPLETED
            t_run.completed_at = datetime.now(timezone.utc)
            
            if t_run.started_at:
                t_run.duration_seconds = (t_run.completed_at - t_run.started_at).total_seconds()
            
            # Recalculate aggregates
            fresh_steps = self.db.query(StepRun).filter(StepRun.pipeline_run_id == t_run.id).all()
            t_run.total_extracted = sum(s.records_out for s in fresh_steps if s.operator_type == OperatorType.EXTRACT)
            t_run.total_loaded = sum(s.records_out for s in fresh_steps if s.operator_type == OperatorType.LOAD)
            t_run.total_failed = sum(s.records_error for s in fresh_steps)
            t_run.bytes_processed = sum(s.bytes_processed for s in fresh_steps)
            
            completed_steps = len([s for s in fresh_steps if s.status == OperatorRunStatus.SUCCESS])

            self.db.add(t_run)
            self.db.commit()
            
            DBLogger.log_job(self.db, self.job_id, "SUCCESS", f"Pipeline orchestration completed. Run #{t_run.run_number} finalized successfully.")
            
            self._broadcast_telemetry({
                "type": "run_completed",
                "run_id": t_run.id,
                "status": "completed",
                "completed_at": t_run.completed_at.isoformat(),
                "duration_seconds": t_run.duration_seconds,
                "total_extracted": t_run.total_extracted,
                "total_loaded": t_run.total_loaded,
                "total_failed": t_run.total_failed,
                "bytes_processed": t_run.bytes_processed,
                "completed_steps": completed_steps,
                "progress_pct": (completed_steps / t_run.total_nodes * 100) if t_run.total_nodes > 0 else 0
            })
            manager.broadcast_sync("jobs_list", {"type": "job_list_update"})
        except Exception as e:
            logger.error(f"Error completing run: {e}")
            self.db.rollback()

    def fail_run(self, pipeline_run: PipelineRun, error: Exception):
        """Mark pipeline run as failed"""
        try:
            self.db.expire_all()
            t_run = self.db.query(PipelineRun).filter(PipelineRun.id == pipeline_run.id).first()
            
            if not t_run:
                return
            
            t_run.status = PipelineRunStatus.FAILED
            t_run.error_message = str(error)
            t_run.completed_at = datetime.now(timezone.utc)
            
            if t_run.started_at:
                t_run.duration_seconds = (t_run.completed_at - t_run.started_at).total_seconds()
            
            # Recalculate aggregates
            fresh_steps = self.db.query(StepRun).filter(StepRun.pipeline_run_id == t_run.id).all()
            t_run.total_extracted = sum(s.records_out for s in fresh_steps if s.operator_type == OperatorType.EXTRACT)
            t_run.total_loaded = sum(s.records_out for s in fresh_steps if s.operator_type == OperatorType.LOAD)
            t_run.total_failed = sum(s.records_error for s in fresh_steps)
            t_run.bytes_processed = sum(s.bytes_processed for s in fresh_steps)

            completed_steps = len([s for s in fresh_steps if s.status == OperatorRunStatus.SUCCESS])

            self.db.add(t_run)
            self.db.commit()
            
            DBLogger.log_job(self.db, self.job_id, "ERROR", f"Pipeline orchestration aborted. Run #{t_run.run_number} failed: {str(error)}")
            
            self._broadcast_telemetry({
                "type": "run_failed",
                "run_id": t_run.id,
                "status": "failed",
                "error_message": str(error),
                "completed_at": t_run.completed_at.isoformat(),
                "total_extracted": t_run.total_extracted,
                "total_loaded": t_run.total_loaded,
                "total_failed": t_run.total_failed,
                "bytes_processed": t_run.bytes_processed,
                "completed_steps": completed_steps,
                "progress_pct": (completed_steps / t_run.total_nodes * 100) if t_run.total_nodes > 0 else 0
            })
            manager.broadcast_sync("jobs_list", {"type": "job_list_update"})
        except Exception as e:
            logger.error(f"Error failing run: {e}")
            self.db.rollback()
    
    def retry_step(self, step_run: StepRun):
        """Mark a step for retry"""
        with SessionLocal() as db:
            t_step = db.query(StepRun).filter(StepRun.id == step_run.id).first()
            if not t_step:
                return
            
            t_step.retry_count += 1
            t_step.status = OperatorRunStatus.PENDING
            t_step.error_message = None
            t_step.error_type = None
            t_step.started_at = None
            t_step.completed_at = None
            
            db.add(t_step)
            db.commit()
            
            logger.info(f"Step {step_run.id} marked for retry (attempt {t_step.retry_count})")
            DBLogger.log_step(self.db, step_run.id, "WARNING", f"Retrying task (Attempt #{t_step.retry_count}). Previous execution attempt failed.")
