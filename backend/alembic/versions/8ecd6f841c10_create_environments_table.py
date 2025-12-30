"""create_environments_table

Revision ID: 8ecd6f841c10
Revises: fac05ff95d44
Create Date: 2025-12-26 01:53:27.024695

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8ecd6f841c10'
down_revision: Union[str, Sequence[str], None] = 'fac05ff95d44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Create the environments table if it doesn't exist
    if 'environments' not in tables:
        op.create_table('environments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('connection_id', sa.Integer(), nullable=False),
            sa.Column('language', sa.String(length=50), nullable=False),
            sa.Column('path', sa.String(length=1024), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('version', sa.String(length=50), nullable=True),
            sa.Column('packages', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_by', sa.String(length=255), nullable=True),
            sa.Column('updated_by', sa.String(length=255), nullable=True),
            sa.ForeignKeyConstraint(['connection_id'], ['connections.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('connection_id', 'language', name='uq_env_connection_language')
        )
        op.create_index(op.f('idx_environments_connection_id'), 'environments', ['connection_id'], unique=False)

    # Handle asset_type enum migration
    # 1. Drop existing type if it exists (to fix case mismatch)
    conn.execute(sa.text("DROP TYPE IF EXISTS assettype CASCADE"))
    
    # 2. Recreate with lowercase labels matching existing data
    asset_type_enum = sa.Enum('table', 'view', 'collection', 'file', 'key_pattern', 'endpoint', 'stream', 'sql_query', 'nosql_query', 'python', 'shell', 'javascript', 'ruby', 'powershell', 'perl', 'c', 'cpp', name='assettype')
    asset_type_enum.create(op.get_bind())

    # 3. Alter column with explicit mapping (lowercasing existing values)
    op.alter_column('assets', 'asset_type',
               existing_type=sa.VARCHAR(length=50),
               type_=asset_type_enum,
               postgresql_using='LOWER(asset_type)::assettype',
               existing_nullable=False)

    # Other metadata changes
    op.drop_table('reporting_consolidated')
    op.add_column('scheduler_events', sa.Column('scheduler_metadata', sa.JSON(), nullable=True))
    if 'sceduler_metadata' in [c['name'] for c in sa.inspect(op.get_bind()).get_columns('scheduler_events')]:
        op.drop_column('scheduler_events', 'sceduler_metadata')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('scheduler_events', sa.Column('sceduler_metadata', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.drop_column('scheduler_events', 'scheduler_metadata')
    
    op.alter_column('assets', 'asset_type',
               existing_type=sa.Enum('table', 'view', 'collection', 'file', 'key_pattern', 'endpoint', 'stream', 'sql_query', 'nosql_query', 'python', 'shell', 'javascript', 'ruby', 'powershell', 'perl', 'c', 'cpp', name='assettype'),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
    
    op.execute("DROP TYPE IF EXISTS assettype CASCADE")

    op.create_table('reporting_consolidated',
        sa.Column('id', sa.BIGINT(), autoincrement=False, nullable=True),
        sa.Column('email', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('hashed_password', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('full_name', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=True),
        sa.Column('is_superuser', sa.BOOLEAN(), autoincrement=False, nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True)
    )
    
    op.drop_index(op.f('idx_environments_connection_id'), table_name='environments')
    op.drop_table('environments')
