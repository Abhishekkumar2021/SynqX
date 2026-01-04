from typing import List, Optional, Any, Dict, Tuple
from datetime import datetime, timezone
import time
from sqlalchemy.orm import Session
from app.models.ephemeral import EphemeralJob
from app.models.enums import JobStatus, JobType
from app.schemas.ephemeral import EphemeralJobCreate, EphemeralJobUpdate
from app.core.logging import get_logger
from app.core.websockets import manager
from app.connectors.factory import ConnectorFactory
from app.services.vault_service import VaultService

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
        is_remote = data.agent_group and data.agent_group != "internal"
        
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
            job.completed_at = datetime.now(timezone.utc)
            if job.started_at:
                job.execution_time_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)
        
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
    def execute_locally(db: Session, job: EphemeralJob):
        """Execute the job logic directly in the backend process."""
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc)
        db.commit()
        
        try:
            if job.job_type == JobType.EXPLORER:
                # Resolve connection
                if not job.connection:
                    raise ValueError("Connection context missing for explorer job")
                
                config = VaultService.get_connector_config(job.connection)

                # Inject Execution Context for Custom Script (Parity with old explorer logic)
                if job.connection.connector_type.value == "custom_script":
                    from app.services.dependency_service import DependencyService
                    dep_service = DependencyService(db, job.connection.id, user_id=job.user_id)
                    exec_ctx = {}
                    exec_ctx.update(dep_service.get_execution_context("python"))
                    exec_ctx.update(dep_service.get_execution_context("node"))
                    config["execution_context"] = exec_ctx

                connector = ConnectorFactory.get_connector(job.connection.connector_type.value, config)
                
                query = job.payload.get("query")
                limit = job.payload.get("limit", 100)
                offset = job.payload.get("offset", 0)
                params = job.payload.get("params", {})
                
                results = []
                total_count = 0
                
                try:
                    results = connector.execute_query(query=query, limit=limit, offset=offset, **params)
                    total_count = connector.get_total_count(query, is_query=True, **params)
                except NotImplementedError:
                    # Fallback to fetch_sample (Parity with old explorer logic)
                    results = connector.fetch_sample(asset=query, limit=limit, offset=offset, **params)
                    total_count = connector.get_total_count(query, is_query=False, **params)
                
                columns = list(results[0].keys()) if results else []
                
                job.status = JobStatus.SUCCESS
                job.result_summary = {"count": len(results), "total_count": total_count, "columns": columns}
                
                # Cap the stored sample size to prevent DB bloat (approx 1MB of JSON)
                if len(results) > 1000:
                    job.result_sample = {"rows": results[:1000], "is_truncated": True}
                else:
                    job.result_sample = {"rows": results}
                
            elif job.job_type == JobType.METADATA:
                # Metadata discovery parity
                pass
                
            job.completed_at = datetime.now(timezone.utc)
            job.execution_time_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)
            
        except Exception as e:
            logger.error(f"Local Ephemeral Job {job.id} failed: {e}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            if job.started_at:
                job.execution_time_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)
            
        db.add(job)
        db.commit()
        
        # Final broadcast
        manager.broadcast_sync(f"ephemeral_job:{job.id}", {
            "type": "ephemeral_job_completed",
            "job_id": job.id,
            "status": job.status.value,
            "result_summary": job.result_summary
        })

    @staticmethod
    def list_jobs(db: Session, workspace_id: int, job_type: Optional[JobType] = None, limit: int = 50) -> List[EphemeralJob]:
        query = db.query(EphemeralJob).filter(EphemeralJob.workspace_id == workspace_id)
        if job_type:
            query = query.filter(EphemeralJob.job_type == job_type)
        return query.order_by(EphemeralJob.created_at.desc()).limit(limit).all()
