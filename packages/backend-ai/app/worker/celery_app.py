"""Compatibility shim: re-exports the main Celery app from ``app.tasks.celery_app``."""

from app.tasks.celery_app import celery_app

__all__ = ["celery_app"]
