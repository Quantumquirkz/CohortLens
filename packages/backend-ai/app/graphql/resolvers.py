from __future__ import annotations

import json
from decimal import Decimal

from celery.result import AsyncResult
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import LensRecord
from app.schemas.models_api import LensPublic
from app.services.chain_manager import ChainManagerError, get_chain_config
from app.services.graph_client import GraphClientError, fetch_user_metrics_for_block_range
from app.tasks.celery_app import celery_app

from .types import (
    DashboardSummaryType,
    HomeStatusType,
    ModelConnectionType,
    ModelType,
    PredictionTaskStatusType,
)


def _to_model_type(row: LensRecord) -> ModelType:
    return ModelType(
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


def list_models(
    db: Session,
    *,
    q: str | None,
    model_type: str | None,
    model_format: str | None,
    owner: str | None,
    active: bool | None,
    sort_by: str,
    sort_dir: str,
    page: int,
    page_size: int,
) -> ModelConnectionType:
    stmt = select(LensRecord)
    if q:
        pattern = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(LensRecord.name).like(pattern)
            | func.lower(LensRecord.description).like(pattern)
        )
    if model_type:
        stmt = stmt.where(LensRecord.model_type == model_type)
    if model_format:
        stmt = stmt.where(LensRecord.model_format == model_format)
    if owner:
        stmt = stmt.where(func.lower(LensRecord.owner) == owner.lower())
    if active is not None:
        stmt = stmt.where(LensRecord.active.is_(active))

    order_col = LensRecord.id
    if sort_by == "price":
        order_col = LensRecord.price_per_query_wei
    elif sort_by == "name":
        order_col = LensRecord.name
    elif sort_by == "created_at":
        order_col = LensRecord.created_at
    order_fn = desc if sort_dir == "desc" else asc
    stmt = stmt.order_by(order_fn(order_col), asc(LensRecord.id))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(total_stmt).scalar_one()

    safe_page_size = max(1, min(page_size, 50))
    safe_page = max(1, page)
    offset = (safe_page - 1) * safe_page_size
    rows = db.execute(stmt.offset(offset).limit(safe_page_size + 1)).scalars().all()
    has_next_page = len(rows) > safe_page_size
    rows = rows[:safe_page_size]

    return ModelConnectionType(
        items=[_to_model_type(r) for r in rows],
        total=total,
        has_next_page=has_next_page,
        page=safe_page,
        page_size=safe_page_size,
    )


def get_model(db: Session, model_id: int) -> ModelType | None:
    row = db.get(LensRecord, model_id)
    if row is None:
        return None
    return _to_model_type(row)


def get_home_status(db: Session) -> HomeStatusType:
    warnings: list[str] = []
    try:
        models_count = db.execute(select(func.count(LensRecord.id))).scalar_one()
    except Exception:
        models_count = 0
        warnings.append("models_count_unavailable")

    chains = settings.get_chains()
    if not chains:
        warnings.append("no_chain_config")
    return HomeStatusType(
        api_status="ok",
        models_count=models_count,
        chain_count=len(chains),
        default_chain=settings.DEFAULT_CHAIN,
        warnings=warnings,
    )


async def get_dashboard_summary(
    protocol: str,
    chain: str,
    start_block: int,
    end_block: int,
) -> DashboardSummaryType:
    warnings: list[str] = []
    try:
        chain_cfg = get_chain_config(chain)
    except ChainManagerError:
        chain_cfg = settings.get_chains().get(settings.DEFAULT_CHAIN)
        warnings.append("chain_fallback_default")
    if chain_cfg is None:
        return DashboardSummaryType(
            protocol=protocol,
            chain=chain,
            start_block=start_block,
            end_block=end_block,
            total_users=0,
            total_volume=0.0,
            avg_gas=0.0,
            tx_count=0,
            warnings=["invalid_chain_configuration"],
        )

    try:
        users = await fetch_user_metrics_for_block_range(
            start_block,
            end_block,
            protocol,
            subgraph_url=chain_cfg.subgraph_url,
        )
    except GraphClientError:
        users = []
        warnings.append("subgraph_query_failed")

    total_users = len(users)
    total_volume = float(sum(Decimal(str(u.get("volume", 0.0))) for u in users))
    tx_count = int(sum(int(u.get("tx_count", 0)) for u in users))
    avg_gas = (
        float(sum(float(u.get("avg_gas", 0.0)) for u in users) / total_users)
        if total_users > 0
        else 0.0
    )
    return DashboardSummaryType(
        protocol=protocol,
        chain=chain,
        start_block=start_block,
        end_block=end_block,
        total_users=total_users,
        total_volume=total_volume,
        avg_gas=avg_gas,
        tx_count=tx_count,
        warnings=warnings,
    )


def get_prediction_task(task_id: str) -> PredictionTaskStatusType:
    r = AsyncResult(task_id, app=celery_app)
    result_json: str | None = None
    if r.successful() and r.result is not None:
        try:
            result_json = json.dumps(r.result)
        except TypeError:
            result_json = str(r.result)
    return PredictionTaskStatusType(task_id=task_id, state=str(r.state), result_json=result_json)


def model_type_to_public(model: ModelType) -> LensPublic:
    return LensPublic(
        id=model.id,
        owner=model.owner,
        name=model.name,
        description=model.description,
        model_hash=model.model_hash,
        hf_repo_id=model.hf_repo_id,
        price_per_query_wei=model.price_per_query_wei,
        model_format=model.model_format,
        model_type=model.model_type,
        active=model.active,
    )

