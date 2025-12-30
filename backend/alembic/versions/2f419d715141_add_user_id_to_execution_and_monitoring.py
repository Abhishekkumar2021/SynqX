"""add_user_id_to_execution_and_monitoring

Revision ID: 2f419d715141
Revises: 3b6b887bdcb6
Create Date: 2025-12-28 20:19:36.252962

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f419d715141'
down_revision: Union[str, Sequence[str], None] = '3b6b887bdcb6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add user_id column as nullable first
    op.add_column('jobs', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('pipeline_runs', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('alerts', sa.Column('user_id', sa.Integer(), nullable=True))

    # 2. Backfill user_id from associated pipelines
    op.execute("""
        UPDATE jobs 
        SET user_id = pipelines.user_id 
        FROM pipelines 
        WHERE jobs.pipeline_id = pipelines.id
    """)
    
    op.execute("""
        UPDATE pipeline_runs 
        SET user_id = pipelines.user_id 
        FROM pipelines 
        WHERE pipeline_runs.pipeline_id = pipelines.id
    """)

    # 3. Backfill alerts user_id (try config first, then pipeline, then job)
    op.execute("""
        UPDATE alerts 
        SET user_id = alert_configs.user_id 
        FROM alert_configs 
        WHERE alerts.alert_config_id = alert_configs.id
    """)
    
    op.execute("""
        UPDATE alerts 
        SET user_id = pipelines.user_id 
        FROM pipelines 
        WHERE alerts.pipeline_id = pipelines.id AND alerts.user_id IS NULL
    """)
    
    op.execute("""
        UPDATE alerts 
        SET user_id = jobs.user_id 
        FROM jobs 
        WHERE alerts.job_id = jobs.id AND alerts.user_id IS NULL
    """)

    # Delete any orphaned alerts that still have no user_id (safest for constraints)
    op.execute("DELETE FROM alerts WHERE user_id IS NULL")
    # Delete any orphaned jobs/runs (shouldn't happen but for safety)
    op.execute("DELETE FROM pipeline_runs WHERE user_id IS NULL")
    op.execute("DELETE FROM jobs WHERE user_id IS NULL")

    # 4. Make columns non-nullable and add foreign keys
    op.alter_column('jobs', 'user_id', nullable=False)
    op.alter_column('pipeline_runs', 'user_id', nullable=False)
    op.alter_column('alerts', 'user_id', nullable=False)

    op.create_foreign_key('jobs_user_id_fkey', 'jobs', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('pipeline_runs_user_id_fkey', 'pipeline_runs', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('alerts_user_id_fkey', 'alerts', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # 5. Add indexes for performance
    op.create_index('ix_jobs_user_id', 'jobs', ['user_id'])
    op.create_index('ix_pipeline_runs_user_id', 'pipeline_runs', ['user_id'])
    op.create_index('ix_alerts_user_id', 'alerts', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_alerts_user_id', table_name='alerts')
    op.drop_index('ix_pipeline_runs_user_id', table_name='pipeline_runs')
    op.drop_index('ix_jobs_user_id', table_name='jobs')
    
    op.drop_constraint('alerts_user_id_fkey', 'alerts', type_='foreignkey')
    op.drop_constraint('pipeline_runs_user_id_fkey', 'pipeline_runs', type_='foreignkey')
    op.drop_constraint('jobs_user_id_fkey', 'jobs', type_='foreignkey')
    
    op.drop_column('alerts', 'user_id')
    op.drop_column('pipeline_runs', 'user_id')
    op.drop_column('jobs', 'user_id')