"""Rate limiting middleware for CohortLens API.

Provides:
- Per-IP rate limiting for public endpoints (prevents abuse).
- Integration with the existing per-plan limits in subscriptions.py.
"""

import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)

# Default: 60 requests per minute per IP
DEFAULT_RATE_LIMIT = 60
DEFAULT_WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter by IP address.

    Limits requests to `max_requests` per `window_seconds` for each unique
    client IP. Exempt paths (like /docs, /openapi.json) can be excluded.
    """

    def __init__(
        self,
        app,
        max_requests: int = DEFAULT_RATE_LIMIT,
        window_seconds: int = DEFAULT_WINDOW_SECONDS,
        exempt_paths: list[str] | None = None,
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.exempt_paths = set(exempt_paths or ["/docs", "/redoc", "/openapi.json"])
        # IP -> list of timestamps
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, considering X-Forwarded-For for proxies."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, ip: str, now: float) -> None:
        """Remove timestamps outside the current window."""
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip rate limiting for exempt paths
        if path in self.exempt_paths:
            return await call_next(request)

        ip = self._get_client_ip(request)
        now = time.time()
        self._cleanup(ip, now)

        if len(self._requests[ip]) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - self._requests[ip][0])) + 1
            logger.warning(
                "Rate limit exceeded for IP=%s on %s (limit=%d/%ds)",
                ip, path, self.max_requests, self.window_seconds,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                    "retry_after_seconds": max(retry_after, 1),
                },
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        self._requests[ip].append(now)

        # Add rate limit headers to response
        response = await call_next(request)
        remaining = max(0, self.max_requests - len(self._requests[ip]))
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(self.window_seconds)

        return response
