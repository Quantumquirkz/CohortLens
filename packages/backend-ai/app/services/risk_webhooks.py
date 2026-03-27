"""Queue outbound AML alert webhooks after high-signal decisions."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.db.models import AmlAlertDelivery, AmlWebhookEndpoint, RiskDecision

log = logging.getLogger(__name__)

_SEVERITY_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def sign_payload(body_json: str, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        body_json.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def queue_alerts_for_decision(db: Session, decision_id: UUID) -> None:
    decision = db.get(RiskDecision, decision_id)
    if decision is None:
        return
    rank = _SEVERITY_RANK.get(decision.severity, 0)
    endpoints = db.query(AmlWebhookEndpoint).filter(AmlWebhookEndpoint.active.is_(True)).all()
    to_enqueue: list[str] = []
    for wh in endpoints:
        events = wh.events or []
        want = False
        if "severity_ge_medium" in events and rank >= _SEVERITY_RANK["MEDIUM"]:
            want = True
        if "case_opened" in events and rank >= _SEVERITY_RANK["MEDIUM"]:
            want = True
        if not want:
            continue
        payload = {
            "type": "risk_decision",
            "decision_id": str(decision.id),
            "chain_id": decision.chain_id,
            "address": decision.address,
            "risk_score": decision.risk_score,
            "severity": decision.severity,
            "recommended_action": decision.recommended_action,
            "ruleset_version": decision.ruleset_version,
            "model_version": decision.model_version,
            "correlation_id": decision.correlation_id,
        }
        delivery = AmlAlertDelivery(
            webhook_endpoint_id=wh.id,
            payload=payload,
            status="pending",
            attempts=0,
        )
        db.add(delivery)
        db.flush()
        to_enqueue.append(str(delivery.id))
    db.commit()
    try:
        from app.tasks.aml_tasks import deliver_webhook_task

        for did in to_enqueue:
            deliver_webhook_task.delay(did)
    except Exception as e:  # noqa: BLE001
        log.warning("Could not alert tasks: %s", e)


def attempt_deliver_webhook(db: Session, delivery_id: UUID) -> None:
    delivery = db.get(AmlAlertDelivery, delivery_id)
    if delivery is None:
        return
    wh = db.get(AmlWebhookEndpoint, delivery.webhook_endpoint_id)
    if wh is None or not wh.active:
        delivery.status = "failed"
        delivery.last_error = "webhook inactive or missing"
        db.commit()
        return

    body_obj = delivery.payload
    body_json = json.dumps(body_obj, sort_keys=True, separators=(",", ":"))
    sig = sign_payload(body_json, wh.signing_secret)
    delivery.attempts = (delivery.attempts or 0) + 1
    try:
        resp = httpx.post(
            wh.target_url,
            content=body_json,
            headers={
                "Content-Type": "application/json",
                "X-CohortLens-Signature": f"sha256={sig}",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        delivery.status = "sent"
        delivery.last_error = None
    except Exception as e:  # noqa: BLE001
        delivery.status = "failed" if delivery.attempts >= 3 else "pending"
        delivery.last_error = str(e)[:4000]
    db.commit()
