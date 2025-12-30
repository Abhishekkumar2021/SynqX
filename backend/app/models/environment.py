from __future__ import annotations
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    String, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.base import Base, AuditMixin

if TYPE_CHECKING:
    from app.models.connections import Connection

class Environment(Base, AuditMixin):
    __tablename__ = "environments"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(
        ForeignKey("connections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(50), nullable=False) # python, node, ruby, etc.
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False) # pending, ready, error
    version: Mapped[Optional[str]] = mapped_column(String(255)) # e.g. 3.9.1
    packages: Mapped[Optional[dict]] = mapped_column(JSON, default=dict) # Cache of installed packages
    
    connection: Mapped["Connection"] = relationship(back_populates="environments")

    __table_args__ = (
        UniqueConstraint("connection_id", "language", name="uq_env_connection_language"),
    )

    def __repr__(self):
        return f"<Environment(id={self.id}, lang={self.language}, status={self.status})>"
