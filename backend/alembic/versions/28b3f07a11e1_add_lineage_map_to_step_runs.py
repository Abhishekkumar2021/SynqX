"""Add lineage_map to step_runs

Revision ID: 28b3f07a11e1
Revises: ebaf7089e604
Create Date: 2026-01-12 05:35:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "28b3f07a11e1"
down_revision: str | Sequence[str] | None = "ebaf7089e604"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add lineage_map to step_runs
    op.add_column("step_runs", sa.Column("lineage_map", sa.JSON(), nullable=True))

    # Based on the logs, it seems workspace_id and audit columns might also be expected by the model  # noqa: E501
    # but were missing in the initial schema for step_runs (AuditMixin wasn't fully reflected in op.create_table)  # noqa: E501
    # Checking ebaf7089e604, it had workspace_id but not updated_at/created_by etc for step_runs.  # noqa: E501
    # Wait, looking at ebaf7089e604:
    # sa.Column('workspace_id', sa.Integer(), nullable=True),
    # sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    # sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    # sa.Column('created_by', sa.String(length=255), nullable=True),
    # sa.Column('updated_by', sa.String(length=255), nullable=True),
    # All those were there for step_runs in the initial schema.
    # Only lineage_map was missing.
    pass


def downgrade() -> None:
    op.drop_column("step_runs", "lineage_map")
