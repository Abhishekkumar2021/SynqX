from sqlalchemy import Column, Integer, String, ForeignKey, Enum, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
from app.utils.agent import is_remote_group
import enum

class WorkspaceRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    default_agent_group = Column(String, nullable=False, server_default="internal", default="internal", comment="Default agent tag for all jobs in this workspace")
    git_config = Column(JSON, nullable=True)
    
    # Relationships
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    pipelines = relationship("Pipeline", back_populates="workspace")
    connections = relationship("Connection", back_populates="workspace")
    
    @property
    def is_remote_group(self) -> bool:
        """
        Check if the workspace is configured to use a remote agent group.
        Returns False if the default agent group is 'internal'.
        """
        return is_remote_group(self.default_agent_group)

class WorkspaceMember(Base, TimestampMixin):
    __tablename__ = "workspace_members"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(WorkspaceRole), default=WorkspaceRole.VIEWER, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),
    )
