"""add_new_job_types_and_ephemeral_jobs_table

Revision ID: 4d8b72a4bd18
Revises: 4759fa44d59e
Create Date: 2026-01-03 18:46:06.928779

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4d8b72a4bd18'
down_revision: Union[str, Sequence[str], None] = '4759fa44d59e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # 1. Create JobType enum values if they don't exist
    # Use standard Postgres command to add values to existing ENUM
    op.execute("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'METADATA'")
    op.execute("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'TEST'")
    op.execute("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'SYSTEM'")
    op.execute("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'FILE'")

    # 2. Create ephemeral_jobs table
    # IMPORTANT: create_type=False tells Alembic to use the existing 'jobtype' and 'jobstatus' types
    op.create_table('ephemeral_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('connection_id', sa.Integer(), nullable=True),
        sa.Column('job_type', postgresql.ENUM('PIPELINE', 'EXPLORER', 'METADATA', 'TEST', 'SYSTEM', 'FILE', name='jobtype', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('PENDING', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYING', 'CANCELLED', name='jobstatus', create_type=False), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('agent_group', sa.String(length=100), nullable=True),
        sa.Column('worker_id', sa.String(length=255), nullable=True),
        sa.Column('result_summary', sa.JSON(), nullable=True),
        sa.Column('result_sample', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.Column('updated_by', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['connection_id'], ['connections.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ephemeral_jobs_agent_group'), 'ephemeral_jobs', ['agent_group'], unique=False)
    op.create_index(op.f('ix_ephemeral_jobs_connection_id'), 'ephemeral_jobs', ['connection_id'], unique=False)
    op.create_index(op.f('ix_ephemeral_jobs_job_type'), 'ephemeral_jobs', ['job_type'], unique=False)
    op.create_index(op.f('ix_ephemeral_jobs_status'), 'ephemeral_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_ephemeral_jobs_workspace_id'), 'ephemeral_jobs', ['workspace_id'], unique=False)

    # 3. Alter existing tables
    op.execute("UPDATE pipelines SET agent_group = 'internal' WHERE agent_group IS NULL")
    op.execute("UPDATE workspaces SET default_agent_group = 'internal' WHERE default_agent_group IS NULL")
    
    op.alter_column('pipelines', 'agent_group',
               existing_type=sa.VARCHAR(length=100),
               nullable=False,
               server_default='internal')
    op.alter_column('workspaces', 'default_agent_group',
               existing_type=sa.VARCHAR(),
               nullable=False,
               server_default='internal',
               existing_comment='Default agent tag for all jobs in this workspace')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('workspaces', 'default_agent_group',
               existing_type=sa.VARCHAR(),
               nullable=True,
               existing_comment='Default agent tag for all jobs in this workspace')
    op.alter_column('pipelines', 'agent_group',
               existing_type=sa.VARCHAR(length=100),
               nullable=True)
    op.drop_table('ephemeral_jobs')
