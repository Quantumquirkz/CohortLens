"""Distributed cache (Redis) for frequent clustering results."""

from __future__ import annotations

import hashlib
import json
from typing import Any

import redis

from app.core.config import settings
from app.schemas.cohort import CohortRequest, CohortResponse


def _cohort_cache_key(request: CohortRequest) -> str:
    payload = {
        "chain": request.chain.lower().strip(),
        "protocol": request.protocol.lower().strip(),
        "start_block": request.start_block,
        "end_block": request.end_block,
        "num_clusters": request.num_clusters,
        "features": sorted(request.features),
    }
    raw = json.dumps(payload, sort_keys=True).encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()
    return f"cohort:cluster:{digest}"


def get_cached_cohort_response(request: CohortRequest) -> CohortResponse | None:
    """Return cached response or None."""
    key = _cohort_cache_key(request)
    r = redis.from_url(settings.REDIS_URL)
    raw = r.get(key)
    if raw is None:
        return None
    if isinstance(raw, bytes):
        text = raw.decode("utf-8")
    else:
        text = str(raw)
    data: dict[str, Any] = json.loads(text)
    return CohortResponse.model_validate(data)


def set_cached_cohort_response(request: CohortRequest, response: CohortResponse, ttl_seconds: int) -> None:
    """Store clustering response with TTL."""
    key = _cohort_cache_key(request)
    r = redis.from_url(settings.REDIS_URL)
    r.setex(key, ttl_seconds, response.model_dump_json())
