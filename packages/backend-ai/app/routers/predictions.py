"""Dedicated async prediction endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.auth_wallet import optional_wallet_auth
from app.limiter import limiter
from app.models.registry import ModelRegistry, ModelRegistryError
from app.schemas.predictions_api import (
    AsyncPredictAccepted,
    AsyncPredictEnqueue,
    AsyncPredictionTaskStatus,
)
from app.services.async_prediction import enqueue_predict, get_prediction_task_snapshot

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
@limiter.limit("60/minute")
async def prediction_task_status(request: Request, task_id: str) -> AsyncPredictionTaskStatus:
    """Celery task state and result when successful."""
    return AsyncPredictionTaskStatus(**get_prediction_task_snapshot(task_id))
