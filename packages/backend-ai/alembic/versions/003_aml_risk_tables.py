"""AML / risk screening tables (cases, decisions, webhooks, batch).

Revision ID: 003
Revises: 002
Create Date: 2026-03-27

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feature_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chain_id", sa.String(length=64), nullable=False),
        sa.Column("address", sa.String(length=42), nullable=False),
        sa.Column("window_start_block", sa.BigInteger(), nullable=False),
        sa.Column("window_end_block", sa.BigInteger(), nullable=False),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("subgraph_block_head", sa.BigInteger(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_feature_snapshots_chain_address",
        "feature_snapshots",
        ["chain_id", "address"],
        unique=False,
    )

    op.create_table(
        "risk_batch_jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chain_id", sa.String(length=64), nullable=False),
        sa.Column("client_profile", sa.String(length=32), nullable=False),
        sa.Column("addresses", sa.JSON(), nullable=False),
        sa.Column("window_preset", sa.String(length=32), nullable=True),
        sa.Column("window_from_block", sa.BigInteger(), nullable=True),
        sa.Column("window_to_block", sa.BigInteger(), nullable=True),
        sa.Column("webhook_url", sa.String(length=512), nullable=True),
        sa.Column("callback_secret", sa.String(length=256), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("processed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("results", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "risk_decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("correlation_id", sa.String(length=128), nullable=True),
        sa.Column("batch_job_id", sa.Uuid(), nullable=True),
        sa.Column("chain_id", sa.String(length=64), nullable=False),
        sa.Column("address", sa.String(length=42), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("recommended_action", sa.String(length=48), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("ruleset_version", sa.String(length=64), nullable=False),
        sa.Column("risk_reasons", sa.JSON(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("feature_snapshot_id", sa.Uuid(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("degraded", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("client_profile", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["batch_job_id"],
            ["risk_batch_jobs.id"],
            name="fk_risk_decisions_batch_job",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["feature_snapshot_id"],
            ["feature_snapshots.id"],
            name="fk_risk_decisions_feature_snapshot",
            ondelete="SET NULL",
        ),
    )
    op.create_index(
        "ix_risk_decisions_correlation_id",
        "risk_decisions",
        ["correlation_id"],
        unique=False,
    )
    op.create_index(
        "ix_risk_decisions_chain_address",
        "risk_decisions",
        ["chain_id", "address"],
        unique=False,
    )
    op.create_index(
        "ix_risk_decisions_batch_job_id",
        "risk_decisions",
        ["batch_job_id"],
        unique=False,
    )

    op.create_table(
        "risk_cases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chain_id", sa.String(length=64), nullable=False),
        sa.Column("address", sa.String(length=42), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("analyst_label", sa.String(length=32), nullable=True),
        sa.Column("latest_decision_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["latest_decision_id"],
            ["risk_decisions.id"],
            name="fk_risk_cases_latest_decision",
            ondelete="SET NULL",
        ),
    )
    op.create_index(
        "ix_risk_cases_chain_address",
        "risk_cases",
        ["chain_id", "address"],
        unique=False,
    )
    op.create_index("ix_risk_cases_status", "risk_cases", ["status"], unique=False)

    op.create_table(
        "risk_case_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("author", sa.String(length=128), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["risk_cases.id"],
            name="fk_risk_case_notes_case",
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_risk_case_notes_case_id",
        "risk_case_notes",
        ["case_id"],
        unique=False,
    )

    op.create_table(
        "aml_webhook_endpoints",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=False),
        sa.Column("target_url", sa.String(length=512), nullable=False),
        sa.Column("events", sa.JSON(), nullable=False),
        sa.Column("signing_secret", sa.String(length=256), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_aml_webhook_tenant",
        "aml_webhook_endpoints",
        ["tenant_id"],
        unique=False,
    )

    op.create_table(
        "aml_alert_deliveries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("webhook_endpoint_id", sa.Uuid(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["webhook_endpoint_id"],
            ["aml_webhook_endpoints.id"],
            name="fk_aml_alert_deliveries_webhook",
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_aml_alert_deliveries_webhook",
        "aml_alert_deliveries",
        ["webhook_endpoint_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_aml_alert_deliveries_webhook", table_name="aml_alert_deliveries")
    op.drop_table("aml_alert_deliveries")
    op.drop_index("ix_aml_webhook_tenant", table_name="aml_webhook_endpoints")
    op.drop_table("aml_webhook_endpoints")
    op.drop_index("ix_risk_case_notes_case_id", table_name="risk_case_notes")
    op.drop_table("risk_case_notes")
    op.drop_index("ix_risk_cases_status", table_name="risk_cases")
    op.drop_index("ix_risk_cases_chain_address", table_name="risk_cases")
    op.drop_table("risk_cases")
    op.drop_index("ix_risk_decisions_batch_job_id", table_name="risk_decisions")
    op.drop_index("ix_risk_decisions_chain_address", table_name="risk_decisions")
    op.drop_index("ix_risk_decisions_correlation_id", table_name="risk_decisions")
    op.drop_table("risk_decisions")
    op.drop_table("risk_batch_jobs")
    op.drop_index("ix_feature_snapshots_chain_address", table_name="feature_snapshots")
    op.drop_table("feature_snapshots")
