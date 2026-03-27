"""Enqueue async predictions (shared across routers)."""

from __future__ import annotations

from datetime import UTC, datetime

from celery.result import AsyncResult

from app.tasks.celery_app import celery_app
from app.tasks.model_tasks import run_predict_task


def enqueue_predict(lens_id: int, features: list[float], *, with_zk: bool = False) -> str:
    """Enqueue ``run_predict_task`` and return ``task_id``."""
    task = run_predict_task.delay(lens_id, features, with_zk=with_zk)
    return str(task.id)


def get_prediction_task_snapshot(task_id: str) -> dict[str, object | None]:
    """Return a normalized async status payload used by both routers."""
    task = AsyncResult(task_id, app=celery_app)
    state = str(task.state)
    result: dict | None = None
    error: str | None = None

    if task.successful():
        state = "SUCCESS"
        value = task.result
        result = value if isinstance(value, dict) else {"value": value}
    elif state in {"FAILURE", "REVOKED"}:
        error = str(task.info) if task.info else "Task did not complete successfully"

    return {
        "task_id": task_id,
        "state": state,
        "result": result,
        "error": error,
        "updated_at": datetime.now(UTC).isoformat(),
    }
