"""Cliente HTTP para el API Kubo (IPFS add/cat)."""

from __future__ import annotations

import io
from typing import Any

import httpx

from app.core.config import settings


class IpfsError(RuntimeError):
    """Error al hablar con el nodo IPFS."""


async def add_bytes(data: bytes, filename: str = "model.bin") -> str:
    """Sube bytes al nodo IPFS y devuelve el CID."""
    base = settings.IPFS_API_URL.rstrip("/")
    url = f"{base}/api/v0/add"
    timeout = httpx.Timeout(120.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        files = {"file": (filename, io.BytesIO(data))}
        resp = await client.post(url, files=files)
    if resp.status_code >= 400:
        raise IpfsError(f"IPFS add falló: {resp.status_code} {resp.text}")
    body: dict[str, Any] = resp.json()
    h = body.get("Hash")
    if not h or not isinstance(h, str):
        raise IpfsError("Respuesta IPFS sin Hash")
    return h


async def cat_bytes(cid: str) -> bytes:
    """Lee un objeto por CID desde el nodo local."""
    base = settings.IPFS_API_URL.rstrip("/")
    url = f"{base}/api/v0/cat"
    timeout = httpx.Timeout(120.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, params={"arg": cid})
    if resp.status_code >= 400:
        raise IpfsError(f"IPFS cat falló: {resp.status_code} {resp.text}")
    return resp.content
