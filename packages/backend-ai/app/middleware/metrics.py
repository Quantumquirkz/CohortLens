"""Prometheus HTTP metrics for the FastAPI backend."""

from __future__ import annotations

from app.core.config import settings
from fastapi import FastAPI


def setup_prometheus(app: FastAPI) -> None:
    """Instrument HTTP latency and expose ``/metrics``."""
    if not settings.PROMETHEUS_ENABLED:
        return
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
