"""Schemas for ``/api/v1/predictions``."""

from pydantic import BaseModel, Field


class AsyncPredictEnqueue(BaseModel):
    lens_id: int = Field(description="Model / lens id in the registry")
    features: list[float]
    with_zk: bool = Field(
        default=False,
        description="If true and ENABLE_ZK_PROOF_FOR_ONNX, generate ZK proof for ONNX",
    )


class AsyncPredictAccepted(BaseModel):
    task_id: str


class AsyncPredictionTaskStatus(BaseModel):
    task_id: str
    state: str
    result: dict | None = None
    error: str | None = None
    updated_at: str
