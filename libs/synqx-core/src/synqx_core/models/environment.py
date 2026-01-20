from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from synqx_core.models.base import AuditMixin, Base

if TYPE_CHECKING:
    from synqx_core.models.connections import Connection


class Environment(Base, AuditMixin):
    __tablename__ = "environments"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(
        ForeignKey("connections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Workspace scoping
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )

    language: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # python, node, etc.
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, ready, error
    version: Mapped[str | None] = mapped_column(String(255))  # e.g. 3.9.1
    packages: Mapped[dict | None] = mapped_column(
        JSON, default=dict
    )  # Cache of installed packages

    connection: Mapped[Connection] = relationship(back_populates="environments")

    __table_args__ = (
        UniqueConstraint(
            "connection_id", "language", name="uq_env_connection_language"
        ),
    )

    def __repr__(self):
        return (
            f"<Environment(id={self.id}, lang={self.language}, status={self.status})>"
        )
