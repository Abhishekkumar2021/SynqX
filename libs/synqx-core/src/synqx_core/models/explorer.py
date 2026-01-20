from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from synqx_core.models.base import AuditMixin, Base

if TYPE_CHECKING:
    from synqx_core.models.connections import Connection


class QueryHistory(Base, AuditMixin):
    __tablename__ = "query_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(
        ForeignKey("connections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Workspace scoping
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )

    query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'success', 'failed'
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(Text)

    connection: Mapped["Connection"] = relationship("Connection")

    def __repr__(self):
        return f"<QueryHistory(id={self.id}, status={self.status})>"
