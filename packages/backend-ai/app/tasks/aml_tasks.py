"""Celery tasks: AML batch screening and webhook delivery."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime
from uuid import UUID

import httpx

from app.core.config import settings
from app.db.models import RiskBatchJob
from app.db.session import SessionLocal
from app.services.risk_engine import evaluate_risk_for_address, persist_screening
from app.services.risk_scoring import ClientProfile
from app.services.risk_webhooks import queue_alerts_for_decision, sign_payload
from app.tasks.celery_app import celery_app

log = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.aml_tasks.deliver_webhook_task")
def deliver_webhook_task(delivery_id: str) -> None:
    db = SessionLocal()
    try:
        from app.services.risk_webhooks import attempt_deliver_webhook

        attempt_deliver_webhook(db, UUID(delivery_id))
    finally:
        db.close()


@celery_app.task(name="app.tasks.aml_tasks.run_risk_batch_job")
def run_risk_batch_job(job_id: str) -> None:
    db = SessionLocal()
    job: RiskBatchJob | None = None
    try:
        job = db.get(RiskBatchJob, UUID(job_id))
        if job is None:
            return
        job.status = "running"
        db.commit()

        chains = settings.get_chains()
        chain_cfg = chains.get(job.chain_id.lower())
        if chain_cfg is None:
            job.status = "failed"
            job.error_message = f"unknown chain_id {job.chain_id}"
            job.completed_at = datetime.now(UTC)
            db.commit()
            return

        subgraph_url = chain_cfg.subgraph_url
        addresses = [str(a).lower() for a in (job.addresses or [])]
        profile: ClientProfile = job.client_profile  # type: ignore[assignment]
        results: list[dict] = []
        job_uuid = job.id

        async def _run_one(addr: str, index: int) -> dict:
            merged, score, elapsed_ms, severity, action, reasons, evidence, head, degraded = (
                await evaluate_risk_for_address(
                    subgraph_url,
                    job.chain_id,  # type: ignore[union-attr]
                    addr,
                    profile,
                    use_cache=True,
                    include_graph_hints=False,
                )
            )
            did: UUID | None = None
            if head > 0:
                evidence_out = dict(evidence)
                did, _ = persist_screening(
                    db,
                    chain_id=job.chain_id,  # type: ignore[union-attr]
                    address=addr,
                    client_profile=profile,
                    correlation_id=f"{job_id}-{index}",
                    risk_score=score,
                    severity=severity,
                    action=action,
                    risk_reasons=reasons,
                    evidence=evidence_out,
                    merged_features=merged,
                    head=head,
                    latency_ms=elapsed_ms,
                    degraded=degraded,
                    batch_job_id=job_uuid,
                )
                queue_alerts_for_decision(db, did)
            return {
                "address": addr,
                "risk_score": score,
                "severity": severity,
                "decision_id": str(did) if did else None,
                "degraded": degraded,
            }

        async def _run_all() -> None:
            nonlocal results
            for idx, addr in enumerate(addresses):
                row = await _run_one(addr, idx)
                results.append(row)
                bj = db.get(RiskBatchJob, job_uuid)
                if bj:
                    bj.processed = idx + 1
                    db.commit()

        asyncio.run(_run_all())

        bj = db.get(RiskBatchJob, job_uuid)
        if bj:
            bj.status = "completed"
            bj.results = results
            bj.processed = len(addresses)
            bj.completed_at = datetime.now(UTC)
            db.commit()

        job_row = db.get(RiskBatchJob, job_uuid)
        if (
            job_row
            and job_row.webhook_url
            and job_row.callback_secret
        ):
            try:
                body = {"job_id": job_id, "status": "completed", "results": results}
                raw = json.dumps(body, sort_keys=True)
                sig = sign_payload(raw, job_row.callback_secret)
                httpx.post(
                    job_row.webhook_url,
                    content=raw,
                    headers={
                        "Content-Type": "application/json",
                        "X-CohortLens-Signature": f"sha256={sig}",
                    },
                    timeout=15.0,
                )
            except Exception as e:  # noqa: BLE001
                log.warning("batch callback failed: %s", e)
    except Exception as e:  # noqa: BLE001
        log.exception("batch job failed")
        db.rollback()
        job = db.get(RiskBatchJob, UUID(job_id))
        if job:
            job.status = "failed"
            job.error_message = str(e)[:4000]
            job.completed_at = datetime.now(UTC)
            db.commit()
    finally:
        db.close()
