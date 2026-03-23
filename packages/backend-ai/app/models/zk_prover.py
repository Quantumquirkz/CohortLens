"""Zero-knowledge proofs: off-chain commitment and IPFS upload; extendable for EZKL CLI."""

from __future__ import annotations

import asyncio
import hashlib
import json
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.ipfs_client import IpfsError, add_bytes


class ZkProverError(RuntimeError):
    """Failed to generate or serialize a ZK proof."""


def generate_proof(
    model_onnx_path: str,
    input_data: list[float],
    output_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Build ZK proof metadata for ONNX inference.

    By default uses a commitment scheme (SHA-256 hash). For SNARK proofs with **EZKL**,
    compile the circuit in your environment and extend this function to invoke the
    ``EZKL_BINARY`` with generated artifacts (witness, pk, vk).
    """
    path = Path(model_onnx_path)
    if not path.is_file():
        msg = f"ONNX model not found: {model_onnx_path}"
        raise ZkProverError(msg)

    commitment = _commitment_hash(model_onnx_path, input_data, output_data)
    return {
        "scheme": "commitment-v1",
        "proof_hash_hex": commitment,
        "ezkl_binary": settings.EZKL_BINARY,
        "note": "Replace with a real EZKL proof when compiled artifacts are available",
    }


def _commitment_hash(model_onnx_path: str, input_data: list[float], output_data: dict[str, Any]) -> str:
    payload = json.dumps(
        {
            "model_path": model_onnx_path,
            "input": input_data,
            "output": output_data,
        },
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def generate_proof_bundle(
    lens_id: int,
    model_onnx_path: str,
    input_data: list[float],
    output_data: dict[str, Any],
) -> dict[str, Any]:
    """Generate proof, upload JSON to IPFS, return CIDs and hashes."""
    proof = generate_proof(model_onnx_path, input_data, output_data)
    bundle = {
        "lens_id": lens_id,
        "proof": proof,
        "input": input_data,
        "output_shape": {k: type(v).__name__ for k, v in output_data.items()},
    }
    raw = json.dumps(bundle, sort_keys=True).encode("utf-8")
    try:
        cid = asyncio.run(add_bytes(raw, filename="zk_proof_bundle.json"))
    except IpfsError as e:
        return {"ok": False, "error": str(e), "lens_id": lens_id, "proof": proof}
    ph = proof.get("proof_hash_hex")
    if isinstance(ph, str) and len(ph) == 64:
        proof_hash_bytes = bytes.fromhex(ph)
    else:
        proof_hash_bytes = hashlib.sha256(raw).digest()
    return {
        "ok": True,
        "lens_id": lens_id,
        "proof": proof,
        "ipfs_cid": cid,
        "proof_hash_hex": proof_hash_bytes.hex(),
    }
