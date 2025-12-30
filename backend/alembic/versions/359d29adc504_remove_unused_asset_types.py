"""remove_unused_asset_types

Revision ID: 359d29adc504
Revises: 9c26b4d40220
Create Date: 2025-12-26 02:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '359d29adc504'
down_revision: Union[str, Sequence[str], None] = '9c26b4d40220'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    
    # Rename old type
    conn.execute(sa.text("ALTER TYPE assettype RENAME TO assettype_old"))
    
    # Create new type with reduced values
    new_type = sa.Enum(
        'table', 'view', 'collection', 'file', 'key_pattern', 'endpoint', 'stream', 
        'sql_query', 'nosql_query', 'python', 'shell', 'javascript', 
        name='assettype'
    )
    new_type.create(conn)
    
    # Update column to use new type
    # We cast to text first, then to new type. 
    # Any values that don't match (removed types) will fail cast if they exist.
    # We should delete them first or map them to something else if needed.
    # Assuming no assets of removed types exist or if they do, we delete them.
    
    # Delete assets with removed types first to avoid errors
    conn.execute(sa.text("DELETE FROM assets WHERE asset_type::text IN ('ruby', 'powershell', 'perl', 'c', 'cpp')"))
    
    op.alter_column('assets', 'asset_type',
        existing_type=sa.VARCHAR(), # It was enum, but we are casting
        type_=new_type,
        postgresql_using='asset_type::text::assettype',
        existing_nullable=False
    )
    
    # Drop old type
    conn.execute(sa.text("DROP TYPE assettype_old"))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    
    # Rename current type
    conn.execute(sa.text("ALTER TYPE assettype RENAME TO assettype_new"))
    
    # Recreate original full type
    old_type = sa.Enum(
        'table', 'view', 'collection', 'file', 'key_pattern', 'endpoint', 'stream', 
        'sql_query', 'nosql_query', 'python', 'shell', 'javascript', 'ruby', 
        'powershell', 'perl', 'c', 'cpp', 
        name='assettype'
    )
    old_type.create(conn)
    
    # Alter column back
    op.alter_column('assets', 'asset_type',
        existing_type=sa.VARCHAR(),
        type_=old_type,
        postgresql_using='asset_type::text::assettype',
        existing_nullable=False
    )
    
    # Drop new type
    conn.execute(sa.text("DROP TYPE assettype_new"))