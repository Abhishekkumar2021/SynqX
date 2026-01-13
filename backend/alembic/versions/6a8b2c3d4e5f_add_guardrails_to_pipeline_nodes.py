"""add_guardrails_to_pipeline_nodes

Revision ID: 6a8b2c3d4e5f
Revises: 597465b74db5
Create Date: 2026-01-14 04:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6a8b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '597465b74db5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('pipeline_nodes', sa.Column('guardrails', sa.JSON(), nullable=True, server_default='[]'))

def downgrade() -> None:
    op.drop_column('pipeline_nodes', 'guardrails')
