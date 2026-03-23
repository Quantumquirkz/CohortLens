"""Tareas asíncronas de inferencia."""

from __future__ import annotations

from typing import Any

from celery import shared_task

from app.db.session import SessionLocal
from app.models.registry import ModelRegistry


@shared_task(name="app.tasks.model_tasks.run_predict")
def run_predict_task(lens_id: int, features: list[float]) -> dict[str, Any]:
    db = SessionLocal()
    try:
        reg = ModelRegistry(db)
        row = reg.get_lens_row(lens_id)
        return reg.predict(row, features)
    finally:
        db.close()
