
from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from synqx_core.models.base import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    event_type: Mapped[str] = mapped_column(
        String(100), index=True
    )  # e.g., "user.login", "pipeline.create"
    target_type: Mapped[str] = mapped_column(
        String(50), nullable=True, index=True
    )  # e.g., "Pipeline", "User"
    target_id: Mapped[int] = mapped_column(Integer, nullable=True)

    details: Mapped[dict] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20))  # "success" or "failure"

    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))

    user = relationship("User")
    workspace = relationship("Workspace")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, event='{self.event_type}')>"
