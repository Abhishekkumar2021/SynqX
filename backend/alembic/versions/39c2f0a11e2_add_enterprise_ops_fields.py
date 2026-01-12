"""Add enterprise ops fields

Revision ID: 39c2f0a11e2
Revises: 28b3f07a11e1
Create Date: 2026-01-12 06:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '39c2f0a11e2'
down_revision: Union[str, Sequence[str], None] = '28b3f07a11e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update pipelines table
    op.add_column('pipelines', sa.Column('sla_config', sa.JSON(), nullable=True, server_default='{}'))
    op.add_column('pipelines', sa.Column('upstream_pipeline_ids', sa.JSON(), nullable=True, server_default='[]'))
    
    # 2. Update jobs table
    op.add_column('jobs', sa.Column('is_backfill', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('jobs', sa.Column('backfill_config', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    op.drop_column('jobs', 'backfill_config')
    op.drop_column('jobs', 'is_backfill')
    op.drop_column('pipelines', 'upstream_pipeline_ids')
    op.drop_column('pipelines', 'sla_config')
