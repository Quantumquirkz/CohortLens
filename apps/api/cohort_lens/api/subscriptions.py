"""Subscription and plan limits for SaaS model."""

import json
from datetime import datetime
from typing import Any, Optional

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)

PLAN_LIMITS = {
    "basic": {"max_customers": 1000, "max_api_calls_per_month": 10000},
    "professional": {"max_customers": 10000, "max_api_calls_per_month": 100000},
    "enterprise": {"max_customers": -1, "max_api_calls_per_month": -1},  # unlimited
}

# In-memory usage counter per tenant for current month (resets when month changes)
_usage: dict[str, tuple[str, int]] = {}  # tenant_id -> (month_key, count)


def get_subscription(tenant_id: str) -> Optional[dict]:
    """Get subscription for a tenant from Neon DB."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        with engine.connect() as conn:
            r = conn.execute(
                text(
                    "SELECT plan, limits FROM subscriptions "
                    "WHERE tenant_id = :tid AND (ends_at IS NULL OR ends_at > NOW()) "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"tid": tenant_id},
            )
            row = r.fetchone()
            if row:
                return {"plan": row[0], "limits": row[1]}
    except Exception as e:
        logger.warning("Failed to get subscription: %s", e)
    return None


def check_limit(tenant_id: str, limit_key: str, current_value: int) -> bool:
    """Check if tenant is within plan limit. Returns True if allowed."""
    sub = get_subscription(tenant_id)
    if not sub:
        return True  # no subscription = allow (dev mode)
    plan = sub.get("plan", "basic")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"])
    max_val = limits.get(limit_key, -1)
    if max_val < 0:
        return True  # unlimited
    return current_value < max_val


def _month_key() -> str:
    """Current year-month string for usage reset."""
    return datetime.utcnow().strftime("%Y-%m")


def increment_api_usage(tenant_id: str) -> int:
    """Increment API call count for tenant in current month. Returns new count."""
    global _usage
    mk = _month_key()
    if tenant_id not in _usage:
        _usage[tenant_id] = (mk, 0)
    stored_mk, count = _usage[tenant_id]
    if stored_mk != mk:
        count = 0
        stored_mk = mk
    count += 1
    _usage[tenant_id] = (stored_mk, count)
    return count


def check_api_usage_limit(tenant_id: str) -> tuple[bool, Optional[str]]:
    """
    Check if tenant is within max_api_calls_per_month. Returns (allowed, error_message).
    If no subscription in DB, allows (dev mode). If over limit, returns (False, message).
    """
    sub = get_subscription(tenant_id)
    if not sub:
        return True, None
    plan = sub.get("plan", "basic")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"])
    max_calls = limits.get("max_api_calls_per_month", -1)
    if max_calls < 0:
        return True, None
    current = _usage.get(tenant_id, ("", 0))[1]
    if _month_key() != _usage.get(tenant_id, ("", 0))[0]:
        current = 0
    if current >= max_calls:
        return False, f"Plan limit reached: max_api_calls_per_month={max_calls}"
    return True, None


def upsert_subscription(
    tenant_id: str,
    plan: str,
    stripe_subscription_id: Optional[str] = None,
    starts_at: Optional[datetime] = None,
    ends_at: Optional[datetime] = None,
    limits: Optional[dict] = None,
) -> bool:
    """Insert a subscription row in Neon DB (history preserved). Returns True on success."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        limits_json = json.dumps(limits or PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"]))
        with engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO subscriptions (tenant_id, plan, stripe_subscription_id, limits, starts_at, ends_at)
                VALUES (:tenant_id, :plan, :stripe_subscription_id, :limits, :starts_at, :ends_at)
                """),
                {
                    "tenant_id": tenant_id,
                    "plan": plan,
                    "stripe_subscription_id": stripe_subscription_id or "",
                    "limits": limits_json,
                    "starts_at": starts_at,
                    "ends_at": ends_at,
                },
            )
            conn.commit()
        logger.info("Inserted subscription for tenant_id=%s plan=%s", tenant_id, plan)
        return True
    except Exception as e:
        logger.warning("Failed to upsert subscription: %s", e)
        return False


def end_subscription_by_stripe_id(stripe_subscription_id: str, ends_at: Optional[datetime] = None) -> bool:
    """Set ends_at for the subscription row with this Stripe ID (e.g. on cancellation)."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        end = ends_at or datetime.utcnow()
        with engine.connect() as conn:
            conn.execute(
                text(
                    "UPDATE subscriptions SET ends_at = :ends_at "
                    "WHERE stripe_subscription_id = :sid AND (ends_at IS NULL OR ends_at > :ends_at)"
                ),
                {"sid": stripe_subscription_id, "ends_at": end},
            )
            conn.commit()
        logger.info("Set subscription ended for stripe_subscription_id=%s", stripe_subscription_id)
        return True
    except Exception as e:
        logger.warning("Failed to end subscription by stripe id: %s", e)
        return False


def set_subscription_ended(tenant_id: str, ends_at: Optional[datetime] = None) -> bool:
    """Set subscription as ended (e.g. after Stripe subscription deleted)."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        end = ends_at or datetime.utcnow()
        with engine.connect() as conn:
            conn.execute(
                text(
                    "UPDATE subscriptions SET ends_at = :ends_at "
                    "WHERE tenant_id = :tenant_id AND (ends_at IS NULL OR ends_at > :ends_at)"
                ),
                {"tenant_id": tenant_id, "ends_at": end},
            )
            conn.commit()
        logger.info("Set subscription ended for tenant_id=%s", tenant_id)
        return True
    except Exception as e:
        logger.warning("Failed to set subscription ended: %s", e)
        return False


def handle_stripe_subscription_event(subscription: Any) -> bool:
    """
    Process a Stripe subscription object and persist to Neon.
    Expects subscription.metadata.tenant_id and optionally subscription.metadata.plan.
    """
    if not subscription:
        return False
    metadata = getattr(subscription, "metadata", None) or {}
    tenant_id = metadata.get("tenant_id") or (getattr(subscription, "customer", None) or "")
    if not tenant_id:
        logger.warning("Stripe subscription has no metadata.tenant_id or customer")
        return False
    plan = metadata.get("plan", "basic")
    stripe_id = getattr(subscription, "id", None) or ""
    start_ts = getattr(subscription, "current_period_start", None)
    end_ts = getattr(subscription, "current_period_end", None)
    starts_at = datetime.utcfromtimestamp(start_ts) if start_ts else None
    ends_at = datetime.utcfromtimestamp(end_ts) if end_ts else None
    limits = PLAN_LIMITS.get(plan)
    return upsert_subscription(
        tenant_id=str(tenant_id),
        plan=plan,
        stripe_subscription_id=stripe_id,
        starts_at=starts_at,
        ends_at=ends_at,
        limits=limits,
    )
