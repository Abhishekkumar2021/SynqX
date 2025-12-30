from typing import Optional, TYPE_CHECKING
from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, AuditMixin

if TYPE_CHECKING:
    from app.models.connections import Connection

class QueryHistory(Base, AuditMixin):
    __tablename__ = "query_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(ForeignKey("connections.id", ondelete="CASCADE"), nullable=False, index=True)
    query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False) # 'success', 'failed'
    execution_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count: Mapped[Optional[int]] = mapped_column(Integer)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    connection: Mapped["Connection"] = relationship("Connection")

    def __repr__(self):
        return f"<QueryHistory(id={self.id}, status={self.status})>"
