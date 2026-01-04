from typing import Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, desc, or_

from app.models.pipelines import Pipeline
from app.models.execution import Job, PipelineRun, StepRun
from app.models.monitoring import Alert, AlertConfig
from app.models.connections import Connection, Asset
from app.models.agent import Agent
from app.models.user import User
from app.models.audit import AuditLog
from app.models.ephemeral import EphemeralJob
from app.models.enums import PipelineStatus, JobStatus, OperatorRunStatus, AlertStatus, AgentStatus
from app.schemas.dashboard import (
    DashboardStats, ThroughputDataPoint, PipelineDistribution, RecentActivity,
    SystemHealth, FailingPipeline, SlowestPipeline, DashboardAlert, ConnectorHealth,
    AgentGroupStats
)
from app.schemas.audit import AuditLogRead
from app.schemas.ephemeral import EphemeralJobResponse
from app.core.logging import get_logger

logger = get_logger(__name__)

class DashboardService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def get_stats(
        self,
        user_id: int,
        workspace_id: Optional[int] = None,
        time_range: str = "24h",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> DashboardStats:
        try:
            now = datetime.now(timezone.utc)

            # Use end_date if provided, otherwise now
            actual_end_date = end_date if end_date else now
            if actual_end_date.tzinfo is None:
                actual_end_date = actual_end_date.replace(tzinfo=timezone.utc)

            actual_start_date = None
            group_interval = 'day'

            if time_range == '24h':
                actual_start_date = actual_end_date - timedelta(days=1)
                group_interval = 'hour'
            elif time_range == '7d':
                actual_start_date = actual_end_date - timedelta(days=7)
                group_interval = 'day'
            elif time_range == '30d':
                actual_start_date = actual_end_date - timedelta(days=30)
                group_interval = 'day'
            elif time_range == 'custom' and start_date:
                actual_start_date = start_date
                if actual_start_date.tzinfo is None:
                    actual_start_date = actual_start_date.replace(tzinfo=timezone.utc)

                # Determine interval based on duration
                duration = actual_end_date - actual_start_date
                if duration.total_seconds() <= 172800: # 48 hours
                    group_interval = 'hour'
                else:
                    group_interval = 'day'

            # Helper for workspace scoping
            def scope_query(query, model):
                if workspace_id:
                    return query.filter(model.workspace_id == workspace_id)
                return query.filter(model.user_id == user_id)

            # --- Agent Stats ---
            agent_query = self.db.query(Agent).filter(Agent.deleted_at.is_(None))
            if workspace_id:
                agent_query = agent_query.filter(Agent.workspace_id == workspace_id)

            agents = agent_query.all()
            total_agents = len(agents)
            active_agents = sum(1 for a in agents if a.status in [AgentStatus.ONLINE, AgentStatus.BUSY])

            # Group by tags['groups']
            group_counts = {}
            for agent in agents:
                groups = agent.tags.get("groups", []) if agent.tags else []
                if not groups:
                    groups = ["Unassigned"]

                for group in groups:
                    if group not in group_counts:
                        group_counts[group] = {"count": 0, "status": "active"}
                    group_counts[group]["count"] += 1

            agent_groups = [
                AgentGroupStats(name=name, count=data["count"], status="active")
                for name, data in group_counts.items()
            ]

            # 1. Global Metrics
            total_pipelines = scope_query(
                self.db.query(func.count(Pipeline.id)).filter(Pipeline.deleted_at.is_(None)),
                Pipeline
            ).scalar() or 0

            active_pipelines = scope_query(
                self.db.query(func.count(Pipeline.id)).filter(
                    and_(Pipeline.status == PipelineStatus.ACTIVE, Pipeline.deleted_at.is_(None))
                ),
                Pipeline
            ).scalar() or 0

            total_connections = scope_query(
                self.db.query(func.count(Connection.id)).filter(Connection.deleted_at.is_(None)),
                Connection
            ).scalar() or 0

            # Inventory Stats
            total_assets = scope_query(
                self.db.query(func.count(Asset.id)).filter(Asset.deleted_at.is_(None)),
                Asset
            ).scalar() or 0

            if workspace_id:
                from app.models.workspace import WorkspaceMember
                total_users = self.db.query(func.count(WorkspaceMember.user_id)).filter(
                    WorkspaceMember.workspace_id == workspace_id
                ).scalar() or 0
            else:
                 total_users = self.db.query(func.count(User.id)).scalar() or 0

            # --- Audit Logs ---
            audit_query = self.db.query(AuditLog)
            if workspace_id:
                audit_query = audit_query.filter(AuditLog.workspace_id == workspace_id)
            
            recent_audit = audit_query.order_by(desc(AuditLog.created_at)).limit(10).all()
            recent_audit_logs = [AuditLogRead.model_validate(a) for a in recent_audit]

            # --- Ephemeral Jobs ---
            ephemeral_query = self.db.query(EphemeralJob)
            if workspace_id:
                ephemeral_query = ephemeral_query.filter(EphemeralJob.workspace_id == workspace_id)
            else:
                ephemeral_query = ephemeral_query.filter(EphemeralJob.user_id == user_id)
            
            recent_ephemeral = ephemeral_query.order_by(desc(EphemeralJob.created_at)).limit(10).all()
            recent_ephemeral_jobs = [EphemeralJobResponse.model_validate(j) for j in recent_ephemeral]

            # Connector Health Distribution            connector_health = []
            try:
                health_query = scope_query(
                    self.db.query(Connection.health_status, func.count(Connection.id)).filter(Connection.deleted_at.is_(None)),
                    Connection
                ).group_by(Connection.health_status).all()
                
                connector_health = [
                    ConnectorHealth(status=status, count=count)
                    for status, count in health_query
                ]
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error calculating connector health: {e}")

            # Period Stats
            period_filters = []
            if workspace_id:
                period_filters.append(Pipeline.workspace_id == workspace_id)
            else:
                period_filters.append(Pipeline.user_id == user_id)
                
            if actual_start_date:
                period_filters.append(Job.created_at >= actual_start_date)
            if end_date:
                period_filters.append(Job.created_at <= actual_end_date)

            jobs_period_query = self.db.query(
                func.count(Job.id).label("total"),
                func.sum(case((Job.status == JobStatus.SUCCESS, 1), else_=0)).label("success"),
                func.avg(Job.execution_time_ms).label("avg_duration"),
                func.sum(PipelineRun.total_loaded).label("total_rows"),
                func.sum(StepRun.records_error).label("total_rejected_rows"),
                func.sum(PipelineRun.bytes_processed).label("total_bytes")
            ).select_from(Job).join(Pipeline, Job.pipeline_id == Pipeline.id).outerjoin(PipelineRun, Job.id == PipelineRun.job_id).outerjoin(StepRun, PipelineRun.id == StepRun.pipeline_run_id).filter(
                and_(*period_filters)
            )
            
            jobs_stats = jobs_period_query.first()
            total_jobs = jobs_stats.total or 0
            success_jobs = jobs_stats.success or 0
            success_rate = (success_jobs / total_jobs * 100) if total_jobs > 0 else 0.0
            avg_duration_ms = float(jobs_stats.avg_duration or 0)
            avg_duration = avg_duration_ms / 1000.0
            total_rows = int(jobs_stats.total_rows or 0)
            total_rejected_rows = int(jobs_stats.total_rejected_rows or 0)
            total_bytes = int(jobs_stats.total_bytes or 0)

            # 2. Pipeline Distribution
            distribution_query = self.db.query(
                Pipeline.status, func.count(Pipeline.id)
            ).filter(Pipeline.deleted_at.is_(None))
            distribution_query = scope_query(distribution_query, Pipeline)
            dist_query = distribution_query.group_by(Pipeline.status).all()
            
            distribution = [
                PipelineDistribution(status=status.value, count=count) 
                for status, count in dist_query
            ]

            # 3. Throughput
            if self.db.bind.dialect.name == 'sqlite':
                if group_interval == 'hour':
                    time_col = func.strftime('%Y-%m-%d %H:00:00', Job.created_at)
                else:
                    time_col = func.strftime('%Y-%m-%d', Job.created_at)
            else:
                time_col = func.date_trunc(group_interval, Job.created_at)
            
            throughput_query = self.db.query(
                time_col.label('time_bucket'),
                func.sum(case((Job.status == JobStatus.SUCCESS, 1), else_=0)).label("success"),
                func.sum(case((Job.status == JobStatus.FAILED, 1), else_=0)).label("failure"),
                func.sum(PipelineRun.total_loaded).label("rows"),
                func.sum(PipelineRun.bytes_processed).label("bytes")
            ).select_from(Job).join(Pipeline, Job.pipeline_id == Pipeline.id).outerjoin(PipelineRun, Job.id == PipelineRun.job_id).filter(
                and_(*period_filters)
            ).group_by(time_col).order_by(time_col)

            throughput_stats = throughput_query.all()
            
            # Zero-filling logic
            throughput_map = {
                (row.time_bucket if isinstance(row.time_bucket, datetime) else 
                 datetime.strptime(row.time_bucket, '%Y-%m-%d %H:00:00' if len(row.time_bucket) > 10 else '%Y-%m-%d').replace(tzinfo=timezone.utc)
                 if isinstance(row.time_bucket, str) else row.time_bucket): row
                for row in throughput_stats
            }

            throughput = []
            
            # Calculate buckets
            if not actual_start_date:
                # Default to 30 days if no start date
                actual_start_date = actual_end_date - timedelta(days=30)
            
            # Normalize buckets
            delta = timedelta(hours=1) if group_interval == 'hour' else timedelta(days=1)
            
            if group_interval == 'hour':
                current_bucket = actual_start_date.replace(minute=0, second=0, microsecond=0)
            else:
                current_bucket = actual_start_date.replace(hour=0, minute=0, second=0, microsecond=0)

            # limit the number of buckets to prevent extreme cases
            max_buckets = 500
            buckets_count = 0

            while current_bucket <= actual_end_date and buckets_count < max_buckets:
                buckets_count += 1
                match = None
                for key, row in throughput_map.items():
                    k = key.replace(tzinfo=timezone.utc) if key.tzinfo is None else key.astimezone(timezone.utc)
                    c = current_bucket.replace(tzinfo=timezone.utc) if current_bucket.tzinfo is None else current_bucket.astimezone(timezone.utc)
                    
                    if group_interval == 'hour':
                        if k.year == c.year and k.month == c.month and k.day == c.day and k.hour == c.hour:
                            match = row
                            break
                    else:
                        if k.year == c.year and k.month == c.month and k.day == c.day:
                            match = row
                            break
                
                if match:
                    throughput.append(ThroughputDataPoint(
                        timestamp=current_bucket,
                        success_count=match.success or 0,
                        failure_count=match.failure or 0,
                        rows_processed=int(match.rows or 0),
                        bytes_processed=int(match.bytes or 0)
                    ))
                else:
                     throughput.append(ThroughputDataPoint(
                        timestamp=current_bucket,
                        success_count=0,
                        failure_count=0,
                        rows_processed=0,
                        bytes_processed=0
                    ))
                
                current_bucket += delta

            # 4. Recent Activity
            recent_jobs_query = self.db.query(Job).join(Pipeline)
            recent_jobs_query = scope_query(recent_jobs_query, Pipeline)
            recent_jobs = recent_jobs_query.order_by(desc(Job.created_at)).limit(10).all()

            activity = []
            for job in recent_jobs:
                duration = None
                if job.execution_time_ms:
                    duration = job.execution_time_ms / 1000.0
                
                activity.append(RecentActivity(
                    id=job.id,
                    pipeline_id=job.pipeline_id,
                    pipeline_name=job.pipeline.name,
                    status=job.status.value,
                    started_at=job.started_at,
                    completed_at=job.completed_at,
                    duration_seconds=duration,
                    user_avatar=None 
                ))

            # 5. System Health (Simulated/Recent Aggregates)
            try:
                # Active workers = jobs currently running
                active_workers_query = self.db.query(func.count(Job.id)).join(Pipeline).filter(
                    Job.status.in_([JobStatus.RUNNING, JobStatus.PENDING])
                )
                active_workers_count = scope_query(active_workers_query, Pipeline).scalar() or 0

                # Average resource usage
                # 1. Try fetching currently running steps
                recent_window = now - timedelta(minutes=15)
                resource_query = self.db.query(
                    func.avg(StepRun.cpu_percent).label('avg_cpu'),
                    func.avg(StepRun.memory_mb).label('avg_mem')
                ).join(PipelineRun).join(Pipeline).filter(
                    and_(
                        StepRun.updated_at >= recent_window,
                        StepRun.status == OperatorRunStatus.RUNNING
                    )
                )
                resource_stats = scope_query(resource_query, Pipeline).first()

                cpu_val = 0.0
                mem_val = 0.0
                
                # Check if we got valid data (non-None averages)
                if resource_stats and resource_stats.avg_cpu is not None:
                    cpu_val = float(resource_stats.avg_cpu)
                    mem_val = float(resource_stats.avg_mem)
                else:
                    # 2. Fallback: Fetch last 10 successful steps to show "Last Known Capacity"
                    # Fetch raw rows and average in python to avoid GroupingError
                    recent_steps_query = self.db.query(
                        StepRun.cpu_percent,
                        StepRun.memory_mb
                    ).join(PipelineRun).join(Pipeline).filter(
                        and_(
                            StepRun.status == OperatorRunStatus.SUCCESS,
                            StepRun.cpu_percent.isnot(None)
                        )
                    )
                    recent_steps = scope_query(recent_steps_query, Pipeline).order_by(desc(StepRun.updated_at)).limit(10).all()
                    
                    if recent_steps:
                        count = len(recent_steps)
                        cpu_sum = sum(s.cpu_percent or 0 for s in recent_steps)
                        mem_sum = sum(s.memory_mb or 0 for s in recent_steps)
                        cpu_val = cpu_sum / count
                        mem_val = mem_sum / count

                system_health = SystemHealth(
                    cpu_percent=round(cpu_val, 1),
                    memory_usage_mb=round(mem_val, 1),
                    active_workers=active_workers_count
                )
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error calculating system health: {e}")
                system_health = SystemHealth(cpu_percent=0, memory_usage_mb=0, active_workers=0)

            # 6. Top Failing Pipelines
            try:
                failing_query = self.db.query(
                    Pipeline.id,
                    Pipeline.name,
                    func.count(Job.id).label('failures')
                ).join(Job).filter(
                    and_(*period_filters, Job.status == JobStatus.FAILED)
                ).group_by(Pipeline.id, Pipeline.name).order_by(desc('failures')).limit(5)
                
                top_failing = [
                    FailingPipeline(id=r.id, name=r.name, failure_count=r.failures)
                    for r in failing_query.all()
                ]
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error calculating failing pipelines: {e}")
                top_failing = []

            # 7. Slowest Pipelines
            try:
                slowest_query = self.db.query(
                    Pipeline.id,
                    Pipeline.name,
                    func.avg(Job.execution_time_ms).label('avg_duration')
                ).join(Job).filter(
                    and_(*period_filters, Job.status == JobStatus.SUCCESS)
                ).group_by(Pipeline.id, Pipeline.name).order_by(desc('avg_duration')).limit(5)

                slowest_pipelines = [
                    SlowestPipeline(
                        id=r.id, 
                        name=r.name, 
                        avg_duration=round(float(r.avg_duration or 0) / 1000.0, 2)
                    ) for r in slowest_query.all()
                ]
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error calculating slowest pipelines: {e}")
                slowest_pipelines = []

            # 8. Recent Alerts
            try:
                alerts_query = self.db.query(Alert).outerjoin(
                    Pipeline, Alert.pipeline_id == Pipeline.id
                ).outerjoin(
                    AlertConfig, Alert.alert_config_id == AlertConfig.id
                )
                
                if workspace_id:
                    alerts_query = alerts_query.filter(
                        or_(
                            Pipeline.workspace_id == workspace_id,
                            AlertConfig.workspace_id == workspace_id
                        )
                    )
                else:
                    alerts_query = alerts_query.filter(
                        or_(
                            Pipeline.user_id == user_id,
                            AlertConfig.user_id == user_id,
                        )
                    )
                    
                recent_alerts = [
                    DashboardAlert(
                        id=a.id,
                        message=a.message,
                        level=a.level.value,
                        created_at=a.created_at,
                        pipeline_id=a.pipeline_id
                    ) for a in alerts_query.all()
                ]
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error fetching recent alerts: {e}")
                recent_alerts = []

            # 9. Issues and Resolution
            try:
                active_issues_query = self.db.query(func.count(Alert.id)).filter(
                    Alert.status == AlertStatus.PENDING
                )
                if workspace_id:
                    active_issues_query = active_issues_query.filter(Alert.workspace_id == workspace_id)
                else:
                    active_issues_query = active_issues_query.filter(Alert.user_id == user_id)
                
                active_issues = active_issues_query.scalar() or 0

                total_alerts_query = self.db.query(func.count(Alert.id))
                resolved_alerts_query = self.db.query(func.count(Alert.id)).filter(
                    Alert.status == AlertStatus.ACKNOWLEDGED
                )
                
                if workspace_id:
                    total_alerts_query = total_alerts_query.filter(Alert.workspace_id == workspace_id)
                    resolved_alerts_query = resolved_alerts_query.filter(Alert.workspace_id == workspace_id)
                else:
                    total_alerts_query = total_alerts_query.filter(Alert.user_id == user_id)
                    resolved_alerts_query = resolved_alerts_query.filter(Alert.user_id == user_id)
                
                total_alerts = total_alerts_query.scalar() or 0
                resolved_alerts = resolved_alerts_query.scalar() or 0
                
                resolution_rate = (resolved_alerts / total_alerts * 100) if total_alerts > 0 else 0.0
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error calculating resolution rate: {e}")
                active_issues = 0
                resolution_rate = 0.0

            return DashboardStats(
                total_pipelines=total_pipelines,
                active_pipelines=active_pipelines,
                total_connections=total_connections,
                connector_health=connector_health,
                
                # Agent Stats
                total_agents=total_agents,
                active_agents=active_agents,
                agent_groups=agent_groups,

                # Inventory Stats
                total_users=total_users,
                total_assets=total_assets,

                total_jobs=total_jobs,
                success_rate=round(success_rate, 1),
                avg_duration=round(avg_duration, 2),
                total_rows=total_rows,
                total_rejected_rows=total_rejected_rows,
                active_issues=active_issues,
                resolution_rate=round(resolution_rate, 1),
                total_bytes=total_bytes,
                
                throughput=throughput,
                pipeline_distribution=distribution,
                recent_activity=activity,
                
                system_health=system_health,
                top_failing_pipelines=top_failing,
                slowest_pipelines=slowest_pipelines,
                recent_alerts=recent_alerts,
                recent_audit_logs=recent_audit_logs,
                recent_ephemeral_jobs=recent_ephemeral_jobs
            )
        except Exception as e:
            logger.error("Error generating dashboard stats", error=str(e), exc_info=True)
            raise e