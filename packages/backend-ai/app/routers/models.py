"""API de modelos (marketplace)."""

from __future__ import annotations

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from web3 import Web3

from app.core.config import settings
from app.db.models import LensRecord
from app.db.session import get_db
from app.deps.auth_wallet import optional_wallet_auth
from app.limiter import limiter
from app.models.registry import (
    ModelRegistry,
    ModelRegistryError,
    validate_onnx_buffer,
    validate_pickle_buffer,
)
from app.schemas.models_api import (
    LensPublic,
    PredictRequest,
    PredictResponse,
    PredictTaskStatus,
    LensUploadResponse,
)
from app.services.blockchain_client import get_web3
from app.services.ipfs_client import IpfsError, add_bytes
from app.services.registry_contract import get_lens, get_registry_contract, lens_count, register_lens
from app.tasks.model_tasks import run_predict_task
from app.worker.celery_app import celery_app

router = APIRouter()


def _registry_ready() -> bool:
    return bool(settings.COHORT_REGISTRY_ADDRESS and settings.REGISTRY_UPLOADER_PRIVATE_KEY)


def _sync_from_chain(db: Session) -> None:
    if not settings.COHORT_REGISTRY_ADDRESS:
        return
    w3 = get_web3(settings.SEPOLIA_RPC_URL)
    c = get_registry_contract(w3, settings.COHORT_REGISTRY_ADDRESS)
    n = lens_count(w3, c)
    for i in range(1, n + 1):
        lens = get_lens(w3, c, i)
        row = db.get(LensRecord, i)
        if row is None:
            row = LensRecord(
                id=i,
                owner=str(lens["owner"]),
                name=str(lens["name"]),
                description=str(lens["description"]),
                cid=str(lens["modelHash"]),
                price_per_query_wei=int(lens["pricePerQuery"]),
                model_format="pickle",
                model_type="",
                active=bool(lens["active"]),
            )
            db.add(row)
        else:
            row.owner = str(lens["owner"])
            row.name = str(lens["name"])
            row.description = str(lens["description"])
            row.cid = str(lens["modelHash"])
            row.price_per_query_wei = int(lens["pricePerQuery"])
            row.active = bool(lens["active"])
    db.commit()


@router.get("", response_model=list[LensPublic])
async def list_models(
    db: Session = Depends(get_db),
    sync_chain: bool = Query(False, description="Sincronizar metadatos desde el contrato"),
) -> list[LensPublic]:
    if sync_chain and settings.COHORT_REGISTRY_ADDRESS:
        _sync_from_chain(db)
    rows = db.execute(select(LensRecord).order_by(LensRecord.id)).scalars().all()
    return [
        LensPublic(
            id=r.id,
            owner=r.owner,
            name=r.name,
            description=r.description,
            model_hash=r.cid,
            price_per_query_wei=r.price_per_query_wei,
            model_format=r.model_format,
            model_type=r.model_type,
            active=r.active,
        )
        for r in rows
    ]


@router.post("/upload", response_model=LensUploadResponse)
@limiter.limit("60/minute")
async def upload_model(
    request: Request,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    model_type: str = Form("generic"),
    price_per_query_wei: int = Form(0),
    model_format: str = Form(..., description="pickle u onnx"),
) -> LensUploadResponse:
    if not _registry_ready():
        raise HTTPException(
            status_code=503,
            detail="Configura COHORT_REGISTRY_ADDRESS y REGISTRY_UPLOADER_PRIVATE_KEY",
        )
    fmt = model_format.lower().strip()
    if fmt not in ("pickle", "onnx"):
        raise HTTPException(status_code=400, detail="model_format debe ser pickle u onnx")

    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande")

    try:
        if fmt == "pickle":
            validate_pickle_buffer(data, settings.MAX_UPLOAD_BYTES)
        else:
            validate_onnx_buffer(data, settings.MAX_UPLOAD_BYTES)
    except ModelRegistryError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    try:
        cid = await add_bytes(data, filename=file.filename or "model.bin")
    except IpfsError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    w3 = get_web3(settings.SEPOLIA_RPC_URL)
    c = get_registry_contract(w3, settings.COHORT_REGISTRY_ADDRESS)
    try:
        lens_id, tx_hash = register_lens(
            w3,
            c,
            settings.REGISTRY_UPLOADER_PRIVATE_KEY,
            name,
            description,
            cid,
            price_per_query_wei,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Registro on-chain falló: {e}") from e

    row = db.get(LensRecord, lens_id)
    lens_onchain = get_lens(w3, c, lens_id)
    owner = Web3.to_checksum_address(str(lens_onchain["owner"]))
    if row is None:
        row = LensRecord(
            id=lens_id,
            owner=owner,
            name=name,
            description=description,
            cid=cid,
            price_per_query_wei=price_per_query_wei,
            model_format=fmt,
            model_type=model_type,
            active=True,
            chain_tx_hash=tx_hash,
        )
        db.add(row)
    else:
        row.owner = owner
        row.name = name
        row.description = description
        row.cid = cid
        row.price_per_query_wei = price_per_query_wei
        row.model_format = fmt
        row.model_type = model_type
        row.chain_tx_hash = tx_hash
    db.commit()

    return LensUploadResponse(lens_id=lens_id, cid=cid, tx_hash=tx_hash)


@router.post("/{model_id}/predict", response_model=PredictResponse)
@limiter.limit("20/minute")
async def predict(
    request: Request,
    model_id: int,
    body: PredictRequest,
    db: Session = Depends(get_db),
    _: str | None = Depends(optional_wallet_auth),
    async_mode: bool = Query(False),
) -> PredictResponse:
    reg = ModelRegistry(db)
    try:
        row = reg.get_lens_row(model_id)
    except ModelRegistryError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    if async_mode:
        task = run_predict_task.delay(model_id, body.features)
        return PredictResponse(
            lens_id=model_id,
            result={},
            task_id=task.id,
            async_mode=True,
        )

    try:
        out = reg.predict(row, body.features)
    except ModelRegistryError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return PredictResponse(lens_id=model_id, result=out, async_mode=False)


@router.get("/predictions/{task_id}", response_model=PredictTaskStatus)
async def prediction_status(task_id: str) -> PredictTaskStatus:
    r = AsyncResult(task_id, app=celery_app)
    if r.state == "PENDING":
        return PredictTaskStatus(task_id=task_id, state=r.state, result=None)
    if r.successful():
        return PredictTaskStatus(task_id=task_id, state="SUCCESS", result=r.result)
    return PredictTaskStatus(task_id=task_id, state=str(r.state), result=None)
