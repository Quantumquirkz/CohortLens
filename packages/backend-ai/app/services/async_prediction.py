"""Enqueue async predictions (shared across routers)."""

from __future__ import annotations

from app.tasks.model_tasks import run_predict_task


def enqueue_predict(lens_id: int, features: list[float], *, with_zk: bool = False) -> str:
    """Enqueue ``run_predict_task`` and return ``task_id``."""
    task = run_predict_task.delay(lens_id, features, with_zk=with_zk)
    return str(task.id)
