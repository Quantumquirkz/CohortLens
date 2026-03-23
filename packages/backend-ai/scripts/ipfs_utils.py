"""Helpers IPFS para scripts (ajusta PYTHONPATH al directorio del paquete)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.ipfs_client import add_bytes as _add_bytes
from app.services.ipfs_client import cat_bytes as _cat_bytes


def add_file(path: str) -> str:
    data = Path(path).read_bytes()
    return asyncio.run(_add_bytes(data, filename=Path(path).name))


def cat_cid(cid: str, out_path: str | None = None) -> bytes:
    data = asyncio.run(_cat_bytes(cid))
    if out_path:
        Path(out_path).write_bytes(data)
    return data


__all__ = ["add_file", "cat_cid"]
