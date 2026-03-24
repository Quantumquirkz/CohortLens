"""Optional wallet signature authentication (EIP-191)."""

from __future__ import annotations

import uuid
from typing import Annotated

import redis
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import Header, HTTPException, Request

from app.core.config import settings


def _redis() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def issue_nonce() -> str:
    n = str(uuid.uuid4())
    r = _redis()
    r.setex(f"nonce:{n}", 300, "1")
    return n


def verify_wallet_signature(
    address: str | None,
    signature: str | None,
    nonce: str | None,
) -> str:
    if not address or not signature or not nonce:
        raise HTTPException(status_code=401, detail="Incomplete wallet headers")
    r = _redis()
    if not r.exists(f"nonce:{nonce}"):
        raise HTTPException(status_code=401, detail="Invalid or expired nonce")
    msg = f"CohortLens auth\nNonce: {nonce}\n"
    message = encode_defunct(text=msg)
    try:
        recovered = Account.recover_message(message, signature=signature)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid signature: {e}") from e
    if recovered.lower() != address.lower():
        raise HTTPException(status_code=401, detail="Signature does not match address")
    r.delete(f"nonce:{nonce}")
    return address


async def optional_wallet_auth(
    request: Request,
    x_wallet_address: Annotated[str | None, Header(alias="X-Wallet-Address")] = None,
    x_wallet_signature: Annotated[str | None, Header(alias="X-Wallet-Signature")] = None,
    x_wallet_nonce: Annotated[str | None, Header(alias="X-Wallet-Nonce")] = None,
) -> str | None:
    if not settings.REQUIRE_WALLET_AUTH:
        return None
    return verify_wallet_signature(x_wallet_address, x_wallet_signature, x_wallet_nonce)


async def resolve_predict_auth(
    _request: Request,
    x_internal_key: Annotated[str | None, Header(alias="X-Internal-Key")] = None,
    x_wallet_address: Annotated[str | None, Header(alias="X-Wallet-Address")] = None,
    x_wallet_signature: Annotated[str | None, Header(alias="X-Wallet-Signature")] = None,
    x_wallet_nonce: Annotated[str | None, Header(alias="X-Wallet-Nonce")] = None,
) -> str | None:
    """When REQUIRE_WALLET_AUTH is true, allow either valid wallet headers or matching X-Internal-Key."""
    if settings.GRADIO_INTERNAL_API_KEY and x_internal_key == settings.GRADIO_INTERNAL_API_KEY:
        return "internal"
    if not settings.REQUIRE_WALLET_AUTH:
        return None
    return verify_wallet_signature(x_wallet_address, x_wallet_signature, x_wallet_nonce)
