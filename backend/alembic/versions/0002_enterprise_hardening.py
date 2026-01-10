"""enterprise hardening

Revision ID: 0002
Revises: 0001
Create Date: 2026-01-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update Users Table for OIDC
    op.add_column('users', sa.Column('oidc_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('oidc_provider', sa.String(), nullable=True))
    op.alter_column('users', 'hashed_password',
               existing_type=sa.String(),
               nullable=True)
    op.create_index(op.f('ix_users_oidc_id'), 'users', ['oidc_id'], unique=True)

    # 2. Update Audit Logs for Security Tracking
    op.add_column('audit_logs', sa.Column('ip_address', sa.String(length=45), nullable=True))
    op.add_column('audit_logs', sa.Column('user_agent', sa.String(length=255), nullable=True))

    # 3. Update Pipeline Nodes for Column Lineage
    op.add_column('pipeline_nodes', sa.Column('column_mapping', sa.JSON(), nullable=True, server_default='{}'))


def downgrade() -> None:
    # 3. Revert Pipeline Nodes
    op.drop_column('pipeline_nodes', 'column_mapping')

    # 2. Revert Audit Logs
    op.drop_column('audit_logs', 'user_agent')
    op.drop_column('audit_logs', 'ip_address')

    # 1. Revert Users Table
    op.drop_index(op.f('ix_users_oidc_id'), table_name='users')
    op.alter_column('users', 'hashed_password',
               existing_type=sa.String(),
               nullable=False)
    op.drop_column('users', 'oidc_provider')
    op.drop_column('users', 'oidc_id')