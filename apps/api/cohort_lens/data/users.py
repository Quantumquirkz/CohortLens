"""User management with Neon DB persistence."""

from typing import Optional

from sqlalchemy import text

from cohort_lens.data.db import get_engine, create_schema
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def create_user(
    username: str,
    email: str,
    hashed_password: str,
    tenant_id: Optional[str] = None,
    is_admin: bool = False,
) -> bool:
    """Create a new user in Neon DB."""
    try:
        engine = get_engine()
        create_schema(engine)
        tid = tenant_id or username  # Default tenant_id to username if not provided
        with engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO users (username, email, hashed_password, tenant_id, is_admin)
                VALUES (:username, :email, :hashed_password, :tenant_id, :is_admin)
                """),
                {
                    "username": username,
                    "email": email,
                    "hashed_password": hashed_password,
                    "tenant_id": tid,
                    "is_admin": is_admin,
                },
            )
            conn.commit()
        logger.info("Created user: %s (tenant: %s)", username, tid)
        return True
    except Exception as e:
        logger.warning("Failed to create user %s: %s", username, e)
        return False


def get_user_by_username(username: str) -> Optional[dict]:
    """Retrieve user details by username."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id, username, email, hashed_password, is_active, is_admin, tenant_id FROM users WHERE username = :u"),
                {"u": username},
            )
            row = result.fetchone()
            if row:
                return {
                    "id": row[0],
                    "username": row[1],
                    "email": row[2],
                    "hashed_password": row[3],
                    "is_active": row[4],
                    "is_admin": row[5],
                    "tenant_id": row[6],
                }
        return None
    except Exception as e:
        logger.warning("Failed to get user %s: %s", username, e)
        return None


def update_last_login(username: str) -> None:
    """Update last_login timestamp for a user."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET last_login = NOW() WHERE username = :u"),
                {"u": username},
            )
            conn.commit()
    except Exception:
        pass


def list_users(limit: int = 100) -> list[dict]:
    """List most recent users."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT username, email, is_active, tenant_id, created_at FROM users ORDER BY created_at DESC LIMIT :l"),
                {"l": limit},
            )
            return [
                {
                    "username": r[0],
                    "email": r[1],
                    "is_active": r[2],
                    "tenant_id": r[3],
                    "created_at": str(r[4]),
                }
                for r in result.fetchall()
            ]
    except Exception:
        return []
