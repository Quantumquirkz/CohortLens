"""Async inference tasks (prediction_tasks queue)."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.registry import ModelRegistry
from app.tasks.base import BaseRetryTask
from app.tasks.celery_app import celery_app


@celery_app.task(
    bind=True,
    base=BaseRetryTask,
    name="app.tasks.model_tasks.run_predict",
)
def run_predict_task(
    self: BaseRetryTask,
    lens_id: int,
    features: list[float],
    with_zk: bool = False,
) -> dict[str, Any]:
    db = SessionLocal()
    try:
        reg = ModelRegistry(db)
        row = reg.get_lens_row(lens_id)
        out = reg.predict(row, features)
        result: dict[str, Any] = {
            "lens_id": lens_id,
            "result": out,
        }
        if (
            with_zk
            and settings.ENABLE_ZK_PROOF_FOR_ONNX
            and row.model_format.lower() == "onnx"
        ):
            path = str(reg.ensure_downloaded(row))
            from app.tasks.zk_tasks import run_zk_proof_task

            zk_payload = run_zk_proof_task.apply(
                args=(lens_id, path, features, out),
            ).get()
            result["zk"] = zk_payload
        return result
    finally:
        db.close()
