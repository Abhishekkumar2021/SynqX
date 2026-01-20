"""add_data_reliability_and_staging_fields

Revision ID: 891b4e5b2172
Revises: 39c2f0a11e2
Create Date: 2026-01-12 07:08:21.651888

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "891b4e5b2172"
down_revision: str | Sequence[str] | None = "39c2f0a11e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Update pipeline_nodes table
    op.add_column(
        "pipeline_nodes",
        sa.Column(
            "write_strategy", sa.String(50), nullable=False, server_default="append"
        ),
    )
    op.add_column(
        "pipeline_nodes",
        sa.Column(
            "schema_evolution_policy",
            sa.String(50),
            nullable=False,
            server_default="strict",
        ),
    )

    # 2. Update connections table
    op.add_column(
        "connections", sa.Column("staging_connection_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_connection_staging_id",
        "connections",
        "connections",
        ["staging_connection_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_connection_staging_id", "connections", type_="foreignkey")
    op.drop_column("connections", "staging_connection_id")
    op.drop_column("pipeline_nodes", "schema_evolution_policy")
    op.drop_column("pipeline_nodes", "write_strategy")
