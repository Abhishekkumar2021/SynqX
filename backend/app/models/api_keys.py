from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, AuditMixin, OwnerMixin

class ApiKey(Base, AuditMixin, OwnerMixin):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    prefix: Mapped[str] = mapped_column(String(8), nullable=False) # Store first few chars for identification
    hashed_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    
    scopes: Mapped[Optional[str]] = mapped_column(String(500)) # comma separated list of scopes
    
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<ApiKey(id={self.id}, name='{self.name}', prefix='{self.prefix}...')>"

    @property
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) > self.expires_at
