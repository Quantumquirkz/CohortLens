"""Pydantic schemas for the models API."""

from __future__ import annotations

from pydantic import BaseModel


class LensPublic(BaseModel):
    id: int
    owner: str
    name: str
    description: str
    model_hash: str
    hf_repo_id: str | None = None
    price_per_query_wei: int
    model_format: str
    model_type: str
    active: bool


class LensDetail(LensPublic):
    feature_count: int | None = None
    sample_input: list[float] | None = None


class LensUploadResponse(BaseModel):
    lens_id: int
    cid: str
    tx_hash: str | None = None


class PredictRequest(BaseModel):
    features: list[float]
    wallet_address: str | None = None


class PredictResponse(BaseModel):
    lens_id: int
    result: dict
    task_id: str | None = None
    async_mode: bool = False


class PredictTaskStatus(BaseModel):
    task_id: str
    state: str
    result: dict | None = None
    error: str | None = None
    updated_at: str
