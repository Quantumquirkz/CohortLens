import time
from typing import Annotated

import jwt
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings
from app.deps.auth_wallet import issue_nonce, verify_wallet_signature
from app.limiter import limiter

router = APIRouter()


@router.get("/nonce")
@limiter.limit("60/minute")
async def get_nonce(request: Request) -> dict[str, str]:
    return {"nonce": issue_nonce()}


class PostgrestTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


@router.post("/postgrest-token", response_model=PostgrestTokenResponse)
@limiter.limit("30/minute")
async def postgrest_token(
    request: Request,
    x_wallet_address: Annotated[str | None, Header(alias="X-Wallet-Address")] = None,
    x_wallet_signature: Annotated[str | None, Header(alias="X-Wallet-Signature")] = None,
    x_wallet_nonce: Annotated[str | None, Header(alias="X-Wallet-Nonce")] = None,
) -> PostgrestTokenResponse:
    """Issue a short-lived JWT for PostgREST (role postgrest_anon; same RLS as anonymous Hub)."""
    if not settings.POSTGREST_JWT_SECRET.strip():
        raise HTTPException(
            status_code=503,
            detail="POSTGREST_JWT_SECRET is not set; configure PostgREST JWT in the API and gateway",
        )
    verify_wallet_signature(x_wallet_address, x_wallet_signature, x_wallet_nonce)
    now = int(time.time())
    exp = now + settings.POSTGREST_JWT_EXPIRE_MINUTES * 60
    payload = {
        "role": "postgrest_anon",
        "sub": (x_wallet_address or "").lower(),
        "iat": now,
        "exp": exp,
    }
    token = jwt.encode(
        payload,
        settings.POSTGREST_JWT_SECRET,
        algorithm="HS256",
    )
    return PostgrestTokenResponse(
        access_token=token,
        expires_in=settings.POSTGREST_JWT_EXPIRE_MINUTES * 60,
    )
