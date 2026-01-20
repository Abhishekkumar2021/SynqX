from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# New SQLAlchemy 2.0 style Base
class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Timestamp tracking for all entities"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class UserTrackingMixin:
    """User tracking for audit trail"""

    created_by: Mapped[str | None] = mapped_column(String(255), index=True)

    updated_by: Mapped[str | None] = mapped_column(String(255))


class AuditMixin(TimestampMixin, UserTrackingMixin):
    """Complete audit trail mixin"""

    # Optional workspace scoping for all audited entities

    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True
    )


class OwnerMixin:
    """Ownership mixin to scope resources to a user"""

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )


class SoftDeleteMixin:
    """Soft delete capability"""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    deleted_by: Mapped[str | None] = mapped_column(String(255))

    @hybrid_property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
