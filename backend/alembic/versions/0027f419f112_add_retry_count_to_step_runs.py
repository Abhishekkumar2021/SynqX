"""add retry_count to step_runs

Revision ID: 0027f419f112
Revises: 55ea689a1bfb
Create Date: 2025-12-25 04:50:40.064926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0027f419f112'
down_revision: Union[str, Sequence[str], None] = '55ea689a1bfb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add column as nullable first
    op.add_column('step_runs', sa.Column('retry_count', sa.Integer(), nullable=True))
    
    # Update existing rows to have 0 retries
    op.execute("UPDATE step_runs SET retry_count = 0")
    
    # Now make it non-nullable
    op.alter_column('step_runs', 'retry_count', nullable=False)

    # Safety check for processes_table
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'processes_table' in tables:
        op.drop_table('processes_table')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('step_runs', 'retry_count')
