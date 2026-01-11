from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Text, ForeignKey, 
    UniqueConstraint, Index, JSON, Enum as SQLEnum, CheckConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from synqx_core.models.base import Base, AuditMixin, SoftDeleteMixin, OwnerMixin
from synqx_core.models.enums import ConnectorType, AssetType

if TYPE_CHECKING:
    from synqx_core.models.execution import Watermark
    from synqx_core.models.environment import Environment
    from synqx_core.models.workspace import Workspace

class Connection(Base, AuditMixin, SoftDeleteMixin, OwnerMixin):
    __tablename__ = "connections"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    connector_type: Mapped[ConnectorType] = mapped_column(
        SQLEnum(ConnectorType), nullable=False
    )

    config_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    config_schema: Mapped[Optional[dict]] = mapped_column(JSON)

    health_status: Mapped[str] = mapped_column(String(50), default="unknown", nullable=False)
    last_test_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_schema_discovery_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    max_concurrent_connections: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    connection_timeout_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    description: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Workspace scoping
    workspace_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="connections")
    assets: Mapped[list["Asset"]] = relationship(
        back_populates="connection", cascade="all, delete-orphan", lazy="selectin"
    )
    
    environments: Mapped[list["Environment"]] = relationship(
        back_populates="connection", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self):
        return f"<Connection(id={self.id}, name='{self.name}', type={self.connector_type})>"


class Asset(Base, AuditMixin, SoftDeleteMixin):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    connection_id: Mapped[int] = mapped_column(
        ForeignKey("connections.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(
        SQLEnum(AssetType, values_callable=lambda obj: [e.value for e in obj]), 
        nullable=False
    )
    fully_qualified_name: Mapped[Optional[str]] = mapped_column(String(500))

    is_source: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_destination: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_incremental_capable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    config: Mapped[Optional[dict]] = mapped_column(JSON) # Add this line for asset-specific configuration
    schema_metadata: Mapped[Optional[dict]] = mapped_column(JSON)
    current_schema_version: Mapped[Optional[int]] = mapped_column(Integer)

    description: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    row_count_estimate: Mapped[Optional[int]] = mapped_column(Integer)
    size_bytes_estimate: Mapped[Optional[int]] = mapped_column(Integer)

    connection: Mapped["Connection"] = relationship(back_populates="assets")
    schema_versions: Mapped[list["AssetSchemaVersion"]] = relationship(
        back_populates="asset",
        cascade="all, delete-orphan",
        order_by="AssetSchemaVersion.version.desc()",
    )
    
    # Using string reference for Watermark to avoid circular import with execution module
    # Watermark is now imported in TYPE_CHECKING above
    watermarks: Mapped[list["Watermark"]] = relationship(
        "Watermark", back_populates="asset", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("connection_id", "name", name="uq_asset_name_per_connection"),
        Index("idx_asset_source_dest", "is_source", "is_destination"),
        CheckConstraint("is_source = TRUE OR is_destination = TRUE", name="ck_asset_direction"),
    )

    def __repr__(self):
        return f"<Asset(id={self.id}, name='{self.name}', type='{self.asset_type}')>"


class AssetSchemaVersion(Base, AuditMixin):
    __tablename__ = "asset_schema_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    version: Mapped[int] = mapped_column(Integer, nullable=False)
    json_schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    discovered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    schema_hash: Mapped[Optional[str]] = mapped_column(String(64))
    change_summary: Mapped[Optional[dict]] = mapped_column(JSON)
    is_breaking_change: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="schema_versions")

    __table_args__ = (
        UniqueConstraint("asset_id", "version", name="uq_asset_schema_version"),
        Index("idx_schema_version_discovered", "asset_id", "discovered_at"),
    )

    def __repr__(self):
        return f"<AssetSchemaVersion(asset_id={self.asset_id}, version={self.version})>"