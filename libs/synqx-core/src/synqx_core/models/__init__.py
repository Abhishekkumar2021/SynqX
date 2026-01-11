# Import Base first
from synqx_core.models.base import (
    Base, 
    TimestampMixin, 
    UserTrackingMixin, 
    AuditMixin, 
    SoftDeleteMixin,
    OwnerMixin
)

from synqx_core.models.enums import (
    ConnectorType,
    PipelineStatus,
    PipelineRunStatus,
    OperatorType,
    OperatorRunStatus,
    JobStatus,
    RetryStrategy,
    DataDirection,
    AlertLevel,
    AlertStatus,
    AlertType,
    AlertDeliveryMethod,
    AgentStatus
)

from synqx_core.models.connections import Connection, Asset, AssetSchemaVersion
from synqx_core.models.environment import Environment
from synqx_core.models.pipelines import Pipeline, PipelineVersion, PipelineNode, PipelineEdge
from synqx_core.models.execution import Job, PipelineRun, StepRun, PipelineRunContext, Watermark
from synqx_core.models.monitoring import SchedulerEvent, JobLog, StepLog, AlertConfig, Alert
from synqx_core.models.user import User
from synqx_core.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from synqx_core.models.api_keys import ApiKey
from synqx_core.models.explorer import QueryHistory
from synqx_core.models.agent import Agent
from synqx_core.models.audit import AuditLog
from synqx_core.models.ephemeral import EphemeralJob

# Export all models for Alembic and easy access
__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "UserTrackingMixin",
    "AuditMixin",
    "SoftDeleteMixin",
    "OwnerMixin",
    
    # Enums
    "ConnectorType",
    "AssetType",
    "PipelineStatus",
    "PipelineRunStatus",
    "OperatorType",
    "OperatorRunStatus",
    "JobStatus",
    "JobType",
    "RetryStrategy",
    "DataDirection",
    "AlertLevel",
    "AlertStatus",
    "AlertType",
    "AlertDeliveryMethod",
    "AgentStatus",

    # Models
    "User",
    "Workspace",
    "WorkspaceMember",
    "WorkspaceRole",
    "Connection",
    "Asset",
    "AssetSchemaVersion",
    "Environment",
    "Pipeline",
    "PipelineVersion",
    "PipelineNode",
    "PipelineEdge",
    "Job",
    "PipelineRun",
    "StepRun",
    "PipelineRunContext",
    "Watermark",
    "JobLog",
    "StepLog",
    "AlertConfig",
    "Alert",
    "ApiKey",
    "QueryHistory",
    "Agent",
    "AuditLog",
    "EphemeralJob",
    "SchedulerEvent",
]