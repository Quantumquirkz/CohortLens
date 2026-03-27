"""Alert webhook registration (outbound delivery from backend)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.models import AmlWebhookEndpoint
from app.db.session import get_db
from app.deps.risk_auth import require_risk_api_key
from app.limiter import limiter
from app.schemas.risk_api import AlertWebhookRegisterRequest, AlertWebhookRegisterResponse

router = APIRouter(dependencies=[Depends(require_risk_api_key)])


@router.post("/webhook", response_model=AlertWebhookRegisterResponse)
@limiter.limit("30/minute")
async def register_alert_webhook(
    request: Request,
    body: AlertWebhookRegisterRequest,
    db: Session = Depends(get_db),
) -> AlertWebhookRegisterResponse:
    wh = AmlWebhookEndpoint(
        tenant_id=body.tenant_id,
        target_url=body.target_url,
        events=body.events,
        signing_secret=body.signing_secret,
        active=True,
    )
    db.add(wh)
    db.commit()
    return AlertWebhookRegisterResponse(webhook_id=str(wh.id))
