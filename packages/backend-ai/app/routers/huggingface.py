"""Hugging Face Hub: link repo id to a lens and download snapshots (allowlist)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import LensRecord
from app.db.session import get_db
from app.schemas.hf_api import HfLinkRequest, HfSyncResponse
from app.schemas.models_api import LensPublic
from app.services.huggingface_sync import (
    HuggingFaceSyncError,
    download_snapshot,
    is_repo_allowed,
    validate_repo_id,
)

router = APIRouter()


@router.patch("/models/{lens_id}/link", response_model=LensPublic)
async def link_hf_repo(
    lens_id: int,
    body: HfLinkRequest,
    db: Session = Depends(get_db),
) -> LensPublic:
    try:
        rid = validate_repo_id(body.hf_repo_id)
    except HuggingFaceSyncError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not is_repo_allowed(rid):
        raise HTTPException(status_code=400, detail="Repository is not in HF_ALLOWED_REPOS")
    row = db.get(LensRecord, lens_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Lens not found")
    row.hf_repo_id = rid
    db.commit()
    db.refresh(row)
    return LensPublic(
        id=row.id,
        owner=row.owner,
        name=row.name,
        description=row.description,
        model_hash=row.cid,
        hf_repo_id=row.hf_repo_id,
        price_per_query_wei=row.price_per_query_wei,
        model_format=row.model_format,
        model_type=row.model_type,
        active=row.active,
    )


@router.post("/models/{lens_id}/sync", response_model=HfSyncResponse)
async def sync_hf_snapshot(lens_id: int, db: Session = Depends(get_db)) -> HfSyncResponse:
    row = db.get(LensRecord, lens_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Lens not found")
    if not row.hf_repo_id:
        raise HTTPException(status_code=400, detail="No hf_repo_id set; PATCH .../link first")
    try:
        path = download_snapshot(row.hf_repo_id)
    except HuggingFaceSyncError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return HfSyncResponse(lens_id=lens_id, hf_repo_id=row.hf_repo_id, snapshot_path=str(path))
