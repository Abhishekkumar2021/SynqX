from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, String, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.hybrid import hybrid_property

# New SQLAlchemy 2.0 style Base
class Base(DeclarativeBase):
    pass

class TimestampMixin:
    """Timestamp tracking for all entities"""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

class UserTrackingMixin:

    """User tracking for audit trail"""

    created_by: Mapped[Optional[str]] = mapped_column(String(255), index=True)

    updated_by: Mapped[Optional[str]] = mapped_column(String(255))





class AuditMixin(TimestampMixin, UserTrackingMixin):

    """Complete audit trail mixin"""

    # Optional workspace scoping for all audited entities

    workspace_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)





class OwnerMixin:
    """Ownership mixin to scope resources to a user"""
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )

class SoftDeleteMixin:
    """Soft delete capability"""
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), index=True
    )
    deleted_by: Mapped[Optional[str]] = mapped_column(String(255))

    @hybrid_property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None