"""Redis cache for risk feature bundles (hot path SLO)."""

from __future__ import annotations

import json
from typing import Any

import redis

from app.core.config import settings


def _client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def feature_cache_key(chain_id: str, address: str, window_end_block: int) -> str:
    a = address.strip().lower()
    return f"risk:feat:{chain_id}:{a}:{window_end_block}"


def get_cached_features(chain_id: str, address: str, window_end_block: int) -> dict[str, Any] | None:
    try:
        r = _client()
        raw = r.get(feature_cache_key(chain_id, address, window_end_block))
        if not raw:
            return None
        return json.loads(raw)
    except redis.RedisError:
        return None


def set_cached_features(
    chain_id: str,
    address: str,
    window_end_block: int,
    payload: dict[str, Any],
    ttl_seconds: int | None = None,
) -> None:
    ttl = ttl_seconds if ttl_seconds is not None else settings.RISK_FEATURE_CACHE_TTL_SECONDS
    try:
        r = _client()
        r.setex(
            feature_cache_key(chain_id, address, window_end_block),
            ttl,
            json.dumps(payload),
        )
    except redis.RedisError:
        pass
