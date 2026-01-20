"""add osdu and domain entity to assettype enum

Revision ID: 011376a84e33
Revises: 0bbb65bd5e0b
Create Date: 2026-01-18 09:05:33.123456

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011376a84e33"
down_revision: str | Sequence[str] | None = "0bbb65bd5e0b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE assettype ADD VALUE IF NOT EXISTS 'osdu_kind'")
        op.execute("ALTER TYPE assettype ADD VALUE IF NOT EXISTS 'domain_entity'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
