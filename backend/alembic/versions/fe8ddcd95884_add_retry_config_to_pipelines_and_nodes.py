"""add retry config to pipelines and nodes

Revision ID: fe8ddcd95884
Revises: 0027f419f112
Create Date: 2025-12-25 05:12:31.035541

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe8ddcd95884'
down_revision: Union[str, Sequence[str], None] = '0027f419f112'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the Enum type first explicitly if needed, but op.add_column with sa.Enum usually handles it.
    # However, to be safe with existing data:
    
    # 1. Add columns as nullable
    op.add_column('pipeline_nodes', sa.Column('retry_strategy', sa.Enum('NONE', 'FIXED', 'EXPONENTIAL_BACKOFF', 'LINEAR_BACKOFF', name='retrystrategy'), nullable=True))
    op.add_column('pipeline_nodes', sa.Column('retry_delay_seconds', sa.Integer(), nullable=True))
    op.add_column('pipelines', sa.Column('retry_strategy', sa.Enum('NONE', 'FIXED', 'EXPONENTIAL_BACKOFF', 'LINEAR_BACKOFF', name='retrystrategy'), nullable=True))
    op.add_column('pipelines', sa.Column('retry_delay_seconds', sa.Integer(), nullable=True))

    # 2. Set default values for existing rows
    op.execute("UPDATE pipelines SET retry_strategy = 'FIXED', retry_delay_seconds = 60")
    op.execute("UPDATE pipeline_nodes SET retry_strategy = 'FIXED', retry_delay_seconds = 60")

    # 3. Make them non-nullable
    op.alter_column('pipelines', 'retry_strategy', nullable=False)
    op.alter_column('pipelines', 'retry_delay_seconds', nullable=False)
    op.alter_column('pipeline_nodes', 'retry_strategy', nullable=False)
    op.alter_column('pipeline_nodes', 'retry_delay_seconds', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pipelines', 'retry_delay_seconds')
    op.drop_column('pipelines', 'retry_strategy')
    op.drop_column('pipeline_nodes', 'retry_delay_seconds')
    op.drop_column('pipeline_nodes', 'retry_strategy')
    # Optional: drop the enum type
    # op.execute("DROP TYPE retrystrategy")
