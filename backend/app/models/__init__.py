# Import Base first
from synqx_core.models.agent import Agent
from synqx_core.models.api_keys import ApiKey
from synqx_core.models.audit import AuditLog
from synqx_core.models.base import (
    AuditMixin,
    Base,
    OwnerMixin,
    SoftDeleteMixin,
    TimestampMixin,
    UserTrackingMixin,
)
from synqx_core.models.connections import Asset, AssetSchemaVersion, Connection
from synqx_core.models.enums import (
    AgentStatus,
    AlertDeliveryMethod,
    AlertLevel,
    AlertStatus,
    AlertType,
    ConnectorType,
    DataDirection,
    JobStatus,
    OperatorRunStatus,
    OperatorType,
    PipelineRunStatus,
    PipelineStatus,
    RetryStrategy,
)
from synqx_core.models.environment import Environment
from synqx_core.models.ephemeral import EphemeralJob
from synqx_core.models.execution import (
    Job,
    PipelineRun,
    PipelineRunContext,
    StepRun,
    Watermark,
)
from synqx_core.models.explorer import QueryHistory
from synqx_core.models.monitoring import (
    Alert,
    AlertConfig,
    JobLog,
    SchedulerEvent,
    StepLog,
)
from synqx_core.models.pipelines import (
    Pipeline,
    PipelineEdge,
    PipelineNode,
    PipelineVersion,
)
from synqx_core.models.user import User
from synqx_core.models.workspace import Workspace, WorkspaceMember, WorkspaceRole

# Export all models for Alembic and easy access
__all__ = [  # noqa: RUF022
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
