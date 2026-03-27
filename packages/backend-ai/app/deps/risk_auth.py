"""Optional API key gate for risk / alerts routes."""

from __future__ import annotations

from fastapi import Header, HTTPException

from app.core.config import settings


async def require_risk_api_key(x_risk_api_key: str | None = Header(None, alias="X-Risk-Api-Key")) -> None:
    keys = settings.risk_api_keys_list()
    if not keys:
        return
    if not x_risk_api_key or x_risk_api_key not in keys:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Risk-Api-Key")
