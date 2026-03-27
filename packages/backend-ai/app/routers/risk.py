"""AML risk screening, batch jobs, and case management API."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import RiskBatchJob, RiskCase, RiskCaseNote, RiskDecision
from app.db.session import get_db
from app.deps.risk_auth import require_risk_api_key
from app.limiter import limiter
from app.schemas.risk_api import (
    RiskBatchAccepted,
    RiskBatchRequest,
    RiskBatchStatusResponse,
    RiskCaseDetailOut,
    RiskCaseNoteCreate,
    RiskCaseNoteOut,
    RiskCaseOut,
    RiskCasePatch,
    RiskScreenRequest,
    RiskScreenResponse,
)
from app.services.risk_engine import run_online_screen
from app.services.risk_webhooks import queue_alerts_for_decision
from app.tasks.aml_tasks import run_risk_batch_job

router = APIRouter(dependencies=[Depends(require_risk_api_key)])


def _subgraph_for_chain(chain_id: str) -> str:
    chains = settings.get_chains()
    cfg = chains.get(chain_id.lower())
    if cfg is None:
        raise HTTPException(status_code=400, detail=f"Unknown chain_id: {chain_id}")
    return cfg.subgraph_url


@router.post("/screen", response_model=RiskScreenResponse)
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def risk_screen(
    request: Request,
    body: RiskScreenRequest,
    db: Session = Depends(get_db),
) -> RiskScreenResponse:
    """Real-time wallet screening (Aave v3 subgraph scope)."""
    opts = body.options
    hints = bool(opts.include_graph_hints if opts else False)
    _ = opts.max_latency_ms if opts else None  # SLO hint for future timeout wiring
    subgraph = _subgraph_for_chain(body.chain_id)
    out = await run_online_screen(
        db,
        subgraph,
        body.chain_id.lower(),
        body.address.lower(),
        body.client_profile,
        body.correlation_id,
        hints,
    )
    if out.get("decision_id"):
        queue_alerts_for_decision(db, UUID(out["decision_id"]))
    return RiskScreenResponse(**out)


@router.post("/batch", response_model=RiskBatchAccepted)
@limiter.limit("12/minute")
async def risk_batch_enqueue(
    request: Request,
    body: RiskBatchRequest,
    db: Session = Depends(get_db),
) -> RiskBatchAccepted:
    if len(body.addresses) > settings.RISK_BATCH_MAX_ADDRESSES:
        raise HTTPException(
            status_code=400,
            detail=f"At most {settings.RISK_BATCH_MAX_ADDRESSES} addresses per batch",
        )
    _subgraph_for_chain(body.chain_id)

    job = RiskBatchJob(
        chain_id=body.chain_id.lower(),
        client_profile=body.client_profile,
        addresses=[a.lower() for a in body.addresses],
        window_preset=body.window.preset if body.window else None,
        window_from_block=body.window.from_block if body.window else None,
        window_to_block=body.window.to_block if body.window else None,
        webhook_url=body.webhook_url,
        callback_secret=body.callback_secret,
        status="queued",
        total=len(body.addresses),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    run_risk_batch_job.delay(str(job.id))
    return RiskBatchAccepted(job_id=str(job.id))


@router.get("/batch/{job_id}", response_model=RiskBatchStatusResponse)
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def risk_batch_status(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
) -> RiskBatchStatusResponse:
    try:
        jid = UUID(job_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid job_id") from e
    job = db.get(RiskBatchJob, jid)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return RiskBatchStatusResponse(
        job_id=str(job.id),
        status=job.status,
        processed=job.processed,
        total=job.total,
        error_message=job.error_message,
        results=job.results,
    )


@router.get("/cases", response_model=list[RiskCaseOut])
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def list_cases(
    request: Request,
    db: Session = Depends(get_db),
    status: str | None = None,
    chain_id: str | None = None,
    limit: int = 50,
) -> list[RiskCaseOut]:
    q = db.query(RiskCase).order_by(RiskCase.updated_at.desc())
    if status:
        q = q.filter(RiskCase.status == status)
    if chain_id:
        q = q.filter(RiskCase.chain_id == chain_id.lower())
    rows = q.limit(min(limit, 200)).all()
    return [
        RiskCaseOut(
            id=str(c.id),
            chain_id=c.chain_id,
            address=c.address,
            status=c.status,
            analyst_label=c.analyst_label,
            latest_decision_id=str(c.latest_decision_id) if c.latest_decision_id else None,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in rows
    ]


@router.get("/cases/{case_id}", response_model=RiskCaseDetailOut)
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def get_case(
    request: Request,
    case_id: str,
    db: Session = Depends(get_db),
) -> RiskCaseDetailOut:
    try:
        cid = UUID(case_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid case_id") from e
    c = db.get(RiskCase, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    notes = (
        db.query(RiskCaseNote)
        .filter(RiskCaseNote.case_id == cid)
        .order_by(RiskCaseNote.created_at.asc())
        .all()
    )
    return RiskCaseDetailOut(
        id=str(c.id),
        chain_id=c.chain_id,
        address=c.address,
        status=c.status,
        analyst_label=c.analyst_label,
        latest_decision_id=str(c.latest_decision_id) if c.latest_decision_id else None,
        created_at=c.created_at.isoformat(),
        updated_at=c.updated_at.isoformat(),
        notes=[
            RiskCaseNoteOut(
                id=str(n.id),
                author=n.author,
                body=n.body,
                created_at=n.created_at.isoformat(),
            )
            for n in notes
        ],
    )


@router.patch("/cases/{case_id}", response_model=RiskCaseOut)
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def patch_case(
    request: Request,
    case_id: str,
    body: RiskCasePatch,
    db: Session = Depends(get_db),
) -> RiskCaseOut:
    try:
        cid = UUID(case_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid case_id") from e
    c = db.get(RiskCase, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if body.status is not None:
        c.status = body.status
    if body.analyst_label is not None:
        c.analyst_label = body.analyst_label
    db.commit()
    db.refresh(c)
    return RiskCaseOut(
        id=str(c.id),
        chain_id=c.chain_id,
        address=c.address,
        status=c.status,
        analyst_label=c.analyst_label,
        latest_decision_id=str(c.latest_decision_id) if c.latest_decision_id else None,
        created_at=c.created_at.isoformat(),
        updated_at=c.updated_at.isoformat(),
    )


@router.post("/cases/{case_id}/notes", response_model=RiskCaseNoteOut)
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def add_case_note(
    request: Request,
    case_id: str,
    body: RiskCaseNoteCreate,
    db: Session = Depends(get_db),
) -> RiskCaseNoteOut:
    try:
        cid = UUID(case_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid case_id") from e
    c = db.get(RiskCase, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    note = RiskCaseNote(case_id=cid, author=body.author, body=body.body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return RiskCaseNoteOut(
        id=str(note.id),
        author=note.author,
        body=note.body,
        created_at=note.created_at.isoformat(),
    )


@router.get("/cases/{case_id}/graph-mvp", response_model=dict)
@limiter.limit(settings.RATE_LIMIT_DEFAULT)
async def case_graph_mvp(
    request: Request,
    case_id: str,
    db: Session = Depends(get_db),
) -> dict:
    """Minimal graph: center wallet + nodes/edges from latest decision evidence."""
    try:
        cid = UUID(case_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid case_id") from e
    c = db.get(RiskCase, cid)
    if c is None or c.latest_decision_id is None:
        raise HTTPException(status_code=404, detail="Case or decision not found")
    dec = db.get(RiskDecision, c.latest_decision_id)
    if dec is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    ev = dec.evidence or {}
    txs = ev.get("supporting_tx_ids") or []
    center = c.address.lower()
    nodes = [{"id": center, "label": "wallet", "kind": "address"}]
    edges: list[dict] = []
    for i, tx in enumerate(txs[:12]):
        tid = f"tx-{i}"
        nodes.append({"id": tid, "label": str(tx)[:10] + "…", "kind": "tx"})
        edges.append({"source": center, "target": tid, "kind": "sample_tx"})
    hints = ev.get("graph_hints") or {}
    if hints:
        nodes.append({"id": "meta-hints", "label": "hint", "kind": "summary"})
    return {"nodes": nodes, "edges": edges, "decision_id": str(dec.id)}
