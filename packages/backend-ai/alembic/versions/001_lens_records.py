"""Lenses table for CohortRegistry cache.

Revision ID: 001
Revises:
Create Date: 2025-03-23

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner", sa.String(length=42), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("cid", sa.String(length=256), nullable=False),
        sa.Column("price_per_query_wei", sa.BigInteger(), nullable=False),
        sa.Column("model_format", sa.String(length=16), nullable=False),
        sa.Column("model_type", sa.String(length=128), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("chain_tx_hash", sa.String(length=66), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_lenses_owner"), "lenses", ["owner"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_lenses_owner"), table_name="lenses")
    op.drop_table("lenses")
