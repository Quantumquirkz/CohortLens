"""Add hf_repo_id and PostgREST RLS on lenses (PostgreSQL only).

Revision ID: 002
Revises: 001
Create Date: 2025-03-24

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def _is_postgres() -> bool:
    bind = op.get_bind()
    return bind.dialect.name == "postgresql"


def upgrade() -> None:
    op.add_column(
        "lenses",
        sa.Column("hf_repo_id", sa.String(length=256), nullable=True),
    )
    if not _is_postgres():
        return

    # PostgREST anonymous role: read only active lenses (public catalog)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgrest_anon') THEN
                CREATE ROLE postgrest_anon NOLOGIN;
            END IF;
        END
        $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgrest_authenticator') THEN
                CREATE ROLE postgrest_authenticator WITH LOGIN PASSWORD 'postgrest_dev_change_me';
            END IF;
        END
        $$;
        """
    )
    op.execute("GRANT postgrest_anon TO postgrest_authenticator;")
    op.execute("GRANT USAGE ON SCHEMA public TO postgrest_anon;")
    op.execute("GRANT SELECT ON lenses TO postgrest_anon;")
    op.execute("ALTER TABLE lenses ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        DROP POLICY IF EXISTS lenses_active_public ON lenses;
        CREATE POLICY lenses_active_public ON lenses
            FOR SELECT TO postgrest_anon
            USING (active = true);
        """
    )


def downgrade() -> None:
    if _is_postgres():
        op.execute("DROP POLICY IF EXISTS lenses_active_public ON lenses;")
        op.execute("ALTER TABLE lenses DISABLE ROW LEVEL SECURITY;")
        op.execute("REVOKE SELECT ON lenses FROM postgrest_anon;")
        op.execute("REVOKE USAGE ON SCHEMA public FROM postgrest_anon;")
        op.execute("REVOKE postgrest_anon FROM postgrest_authenticator;")
        op.execute(
            """
            DO $$
            BEGIN
                DROP ROLE IF EXISTS postgrest_authenticator;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END
            $$;
            """
        )
        op.execute(
            """
            DO $$
            BEGIN
                DROP ROLE IF EXISTS postgrest_anon;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END
            $$;
            """
        )

    op.drop_column("lenses", "hf_repo_id")
