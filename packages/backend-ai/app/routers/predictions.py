"""Dedicated async prediction endpoints."""

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.limiter import limiter
from app.deps.auth_wallet import optional_wallet_auth
from app.models.registry import ModelRegistry, ModelRegistryError
from app.schemas.predictions_api import (
    AsyncPredictAccepted,
    AsyncPredictionTaskStatus,
    AsyncPredictEnqueue,
)
from app.services.async_prediction import enqueue_predict
from app.tasks.celery_app import celery_app

router = APIRouter()


@router.post("/async", response_model=AsyncPredictAccepted)
@limiter.limit("20/minute")
async def predict_async(
    request: Request,
    body: AsyncPredictEnqueue,
    db: Session = Depends(get_db),
    _: str | None = Depends(optional_wallet_auth),
) -> AsyncPredictAccepted:
    """Enqueue inference and return ``task_id``."""
    reg = ModelRegistry(db)
    try:
        reg.get_lens_row(body.lens_id)
    except ModelRegistryError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    task_id = enqueue_predict(body.lens_id, body.features, with_zk=body.with_zk)
    return AsyncPredictAccepted(task_id=task_id)


@router.get("/{task_id}/status", response_model=AsyncPredictionTaskStatus)
async def prediction_task_status(task_id: str) -> AsyncPredictionTaskStatus:
    """Celery task state and result when successful."""
    r = AsyncResult(task_id, app=celery_app)
    if r.state == "PENDING":
        return AsyncPredictionTaskStatus(task_id=task_id, state=r.state, result=None)
    if r.successful():
        res = r.result
        if not isinstance(res, dict):
            return AsyncPredictionTaskStatus(
                task_id=task_id,
                state="SUCCESS",
                result={"value": res},
            )
        return AsyncPredictionTaskStatus(task_id=task_id, state="SUCCESS", result=res)
    err = str(r.info) if r.info else None
    return AsyncPredictionTaskStatus(
        task_id=task_id,
        state=str(r.state),
        result={"error": err} if err else None,
    )
