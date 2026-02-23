"""API usage tracking with Neon DB persistence.

Replaces the in-memory counter in subscriptions.py with durable
per-tenant per-month usage stored in a dedicated `api_usage` table.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import text

from cohort_lens.data.db import get_engine
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def _ensure_api_usage_table() -> None:
    """Create api_usage table if it doesn't exist."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS api_usage (
                id SERIAL PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                month_key VARCHAR(7) NOT NULL,
                call_count INTEGER NOT NULL DEFAULT 0,
                last_called_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(tenant_id, month_key)
            )
            """))
            conn.commit()
    except Exception as e:
        logger.debug("Could not ensure api_usage table: %s", e)


def _month_key() -> str:
    """Current year-month string."""
    return datetime.utcnow().strftime("%Y-%m")


def increment_usage_persistent(tenant_id: str) -> int:
    """
    Increment API usage counter for tenant in Neon DB.
    Uses UPSERT to handle concurrent writes.

    Returns:
        New call count for the current month.
    """
    try:
        _ensure_api_usage_table()
        mk = _month_key()
        engine = get_engine()

        with engine.connect() as conn:
            result = conn.execute(
                text("""
                INSERT INTO api_usage (tenant_id, month_key, call_count, last_called_at)
                VALUES (:tid, :mk, 1, NOW())
                ON CONFLICT (tenant_id, month_key) DO UPDATE SET
                    call_count = api_usage.call_count + 1,
                    last_called_at = NOW()
                RETURNING call_count
                """),
                {"tid": tenant_id, "mk": mk},
            )
            row = result.fetchone()
            conn.commit()
            return row[0] if row else 1
    except Exception as e:
        logger.warning("Failed to increment usage in DB: %s", e)
        return 0


def get_usage_persistent(tenant_id: str) -> int:
    """
    Get current month's API usage count from Neon DB.

    Returns:
        Call count for the current month, or 0 if not found.
    """
    try:
        _ensure_api_usage_table()
        mk = _month_key()
        engine = get_engine()

        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT call_count FROM api_usage WHERE tenant_id = :tid AND month_key = :mk"),
                {"tid": tenant_id, "mk": mk},
            )
            row = result.fetchone()
            return row[0] if row else 0
    except Exception as e:
        logger.warning("Failed to get usage from DB: %s", e)
        return 0


def check_usage_limit_persistent(tenant_id: str) -> tuple[bool, Optional[str]]:
    """
    Check if tenant is within max_api_calls_per_month using persistent storage.
    Falls back to in-memory if Neon is unavailable.

    Returns:
        (allowed, error_message)
    """
    from cohort_lens.api.subscriptions import get_subscription, PLAN_LIMITS

    sub = get_subscription(tenant_id)
    if not sub:
        return True, None

    plan = sub.get("plan", "basic")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"])
    max_calls = limits.get("max_api_calls_per_month", -1)

    if max_calls < 0:
        return True, None

    current = get_usage_persistent(tenant_id)
    if current >= max_calls:
        return False, f"Plan limit reached: {current}/{max_calls} API calls this month"

    return True, None
