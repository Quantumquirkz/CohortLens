"""Schemas for Hugging Face Hub routes."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HfLinkRequest(BaseModel):
    hf_repo_id: str = Field(..., description="Hub repo id, e.g. org/name")


class HfSyncResponse(BaseModel):
    lens_id: int
    hf_repo_id: str
    snapshot_path: str
