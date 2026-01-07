from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.ephemeral import EphemeralJob
from app.models.enums import JobStatus, JobType
from app.schemas.ephemeral import EphemeralJobCreate, EphemeralJobUpdate
from app.core.logging import get_logger
from app.core.websockets import manager
from app.utils.agent import is_remote_group

logger = get_logger(__name__)

class EphemeralJobService:
    @staticmethod
    def create_job(
        db: Session, 
        workspace_id: int, 
        user_id: int, 
        data: EphemeralJobCreate
    ) -> EphemeralJob:
        from app.services.agent_service import AgentService
        from app.core.errors import AppError

        # Determine target status
        is_remote = is_remote_group(data.agent_group)
        
        if is_remote:
            if not AgentService.is_group_active(db, workspace_id, data.agent_group):
                raise AppError(f"No active agents found in group '{data.agent_group}'. Please ensure your remote agent is running.")
            status = JobStatus.QUEUED
        else:
            status = JobStatus.PENDING

        job = EphemeralJob(
            workspace_id=workspace_id,
            user_id=user_id,
            connection_id=data.connection_id,
            job_type=data.job_type,
            payload=data.payload,
            agent_group=data.agent_group,
            status=status
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Broadcast job creation
        manager.broadcast_sync(f"workspace:{workspace_id}", {
            "type": "ephemeral_job_created",
            "job_id": job.id,
            "job_type": job.job_type.value
        })
        
        return job

    @staticmethod
    def update_job(db: Session, job_id: int, data: EphemeralJobUpdate) -> EphemeralJob:
        job = db.query(EphemeralJob).get(job_id)
        if not job:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(job, field, value)
            
        if data.status == JobStatus.SUCCESS or data.status == JobStatus.FAILED:
            now = datetime.now(timezone.utc)
            job.completed_at = now
            if job.started_at:
                start = job.started_at
                if start.tzinfo is None:
                    start = start.replace(tzinfo=timezone.utc)
                job.execution_time_ms = int((now - start).total_seconds() * 1000)
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Broadcast status change
        manager.broadcast_sync(f"ephemeral_job:{job.id}", {
            "type": "ephemeral_job_update",
            "job_id": job.id,
            "status": job.status.value,
            "error": job.error_message
        })
        
        return job

    @staticmethod
    def list_jobs(db: Session, workspace_id: int, job_type: Optional[JobType] = None, limit: int = 50) -> List[EphemeralJob]:
        query = db.query(EphemeralJob).filter(EphemeralJob.workspace_id == workspace_id)
        if job_type:
            query = query.filter(EphemeralJob.job_type == job_type)
        return query.order_by(EphemeralJob.created_at.desc()).limit(limit).all()
