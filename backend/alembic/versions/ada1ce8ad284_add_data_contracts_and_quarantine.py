"""add_data_contracts_and_quarantine

Revision ID: ada1ce8ad284
Revises: 891b4e5b2172
Create Date: 2026-01-12 07:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ada1ce8ad284"
down_revision: str | Sequence[str] | None = "891b4e5b2172"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Update pipeline_nodes table
    op.add_column(
        "pipeline_nodes",
        sa.Column("data_contract", sa.JSON(), nullable=True, server_default="{}"),
    )
    op.add_column(
        "pipeline_nodes", sa.Column("quarantine_asset_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_node_quarantine_asset_id",
        "pipeline_nodes",
        "assets",
        ["quarantine_asset_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_node_quarantine_asset_id", "pipeline_nodes", type_="foreignkey"
    )
    op.drop_column("pipeline_nodes", "quarantine_asset_id")
    op.drop_column("pipeline_nodes", "data_contract")
