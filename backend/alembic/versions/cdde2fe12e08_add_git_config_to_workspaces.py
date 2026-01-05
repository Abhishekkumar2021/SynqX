"""add_git_config_to_workspaces

Revision ID: cdde2fe12e08
Revises: 4d8b72a4bd18
Create Date: 2026-01-05 15:04:20.683478

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdde2fe12e08'
down_revision: Union[str, Sequence[str], None] = '4d8b72a4bd18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('workspaces', sa.Column('git_config', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('workspaces', 'git_config')
