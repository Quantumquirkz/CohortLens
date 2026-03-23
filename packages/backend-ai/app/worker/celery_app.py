"""Aplicación Celery para tareas en segundo plano."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "cohortlens",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "oracle-scan": {
        "task": "app.worker.tasks.scan_and_fulfill_oracle",
        "schedule": 30.0,
    },
}

import app.worker.tasks  # noqa: E402,F401 — registra tareas al importar el módulo
