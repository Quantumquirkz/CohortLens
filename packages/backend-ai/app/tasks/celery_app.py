"""Celery application: queues ml_tasks, prediction_tasks, zk_tasks."""

from __future__ import annotations

from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings

default_exchange = Exchange("cohortlens", type="direct")

celery_app = Celery(
    "cohortlens",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.oracle_tasks",
        "app.tasks.model_tasks",
        "app.tasks.zk_tasks",
        "app.tasks.aml_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="prediction_tasks",
    task_queues=(
        Queue(
            "ml_tasks",
            exchange=default_exchange,
            routing_key="ml_tasks",
        ),
        Queue(
            "prediction_tasks",
            exchange=default_exchange,
            routing_key="prediction_tasks",
        ),
        Queue(
            "zk_tasks",
            exchange=default_exchange,
            routing_key="zk_tasks",
        ),
        Queue(
            "aml_tasks",
            exchange=default_exchange,
            routing_key="aml_tasks",
        ),
    ),
    task_routes={
        "app.tasks.oracle_tasks.*": {"queue": "ml_tasks"},
        "app.tasks.model_tasks.*": {"queue": "prediction_tasks"},
        "app.tasks.zk_tasks.*": {"queue": "zk_tasks"},
        "app.tasks.aml_tasks.*": {"queue": "aml_tasks"},
    },
)

celery_app.conf.beat_schedule = {
    "oracle-scan": {
        "task": "app.tasks.oracle_tasks.scan_and_fulfill_oracle",
        "schedule": 30.0,
    },
}
