"""Cliente web3.py para CohortOracle en Sepolia."""

from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract

from app.schemas.cohort import CohortResponse

_ABI_PATH = Path(__file__).resolve().parent.parent / "abis" / "cohort_oracle.json"


def _load_abi() -> list[dict[str, Any]]:
    raw = _ABI_PATH.read_text(encoding="utf-8")
    return json.loads(raw)


def get_web3(rpc_url: str) -> Web3:
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        msg = f"No se pudo conectar al RPC: {rpc_url}"
        raise RuntimeError(msg)
    return w3


def get_oracle_contract(w3: Web3, address: str) -> Contract:
    checksum = Web3.to_checksum_address(address)
    return w3.eth.contract(address=checksum, abi=_load_abi())


def _apply_fee_fields(w3: Web3, tx: dict[str, Any]) -> None:
    """Rellena gasPrice o EIP-1559 para redes como Sepolia."""
    last = w3.eth.get_block("latest")
    base = last.get("baseFeePerGas")
    if base is not None:
        prio = w3.to_wei(1, "gwei")
        tx["maxPriorityFeePerGas"] = prio
        tx["maxFeePerGas"] = base * 2 + prio
        tx["type"] = 2
    else:
        tx["gasPrice"] = w3.eth.gas_price


def build_prediction_input_bytes(response: CohortResponse) -> bytes:
    """Entrada compacta para ``requestPrediction`` (hash de centroides + metadatos, gzip)."""
    centers = [c.center for c in response.cohorts]
    digest = hashlib.sha256(
        json.dumps(centers, sort_keys=True).encode("utf-8"),
    ).hexdigest()
    payload: dict[str, Any] = {
        "centroid_sha256": digest,
        "total_users": response.total_users,
        "n_clusters": len(response.cohorts),
    }
    return gzip.compress(json.dumps(payload).encode("utf-8"))


def build_fulfillment_bytes(response: CohortResponse) -> bytes:
    """Resultado completo (gzip JSON) para ``fulfillRequest``."""
    return gzip.compress(response.model_dump_json().encode("utf-8"))


def request_prediction(
    w3: Web3,
    contract: Contract,
    private_key: str,
    lens_id: int,
    input_bytes: bytes,
) -> tuple[int, str]:
    """Envía ``requestPrediction`` y devuelve ``(requestId, tx_hash_hex)``."""
    account = Account.from_key(private_key)
    chain_id = w3.eth.chain_id

    tx = contract.functions.requestPrediction(lens_id, input_bytes).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 500_000,
            "chainId": chain_id,
        },
    )
    _apply_fee_fields(w3, tx)
    gas_est = w3.eth.estimate_gas(tx)
    tx["gas"] = int(gas_est * 1.2) + 50_000

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    oracle_addr = contract.address
    request_id = _parse_request_id_from_logs(w3, receipt, oracle_addr)
    th = receipt["transactionHash"]
    tx_hex = Web3.to_hex(th) if th is not None else ""
    return request_id, tx_hex


def _parse_request_id_from_logs(w3: Web3, receipt: Any, oracle_address: str) -> int:
    oc = w3.eth.contract(address=Web3.to_checksum_address(oracle_address), abi=_load_abi())
    for log in receipt["logs"]:
        if log["address"].lower() != oracle_address.lower():
            continue
        try:
            decoded = oc.events.PredictionRequested().process_log(log)  # type: ignore[union-attr]
        except Exception:
            continue
        args = decoded["args"] if isinstance(decoded, dict) else getattr(decoded, "args", None)
        if args is None:
            continue
        rid = args["requestId"] if isinstance(args, dict) else getattr(args, "requestId", None)
        if rid is None:
            continue
        return int(rid)
    msg = "No se encontró PredictionRequested en el recibo"
    raise RuntimeError(msg)


def fulfill_request(
    w3: Web3,
    contract: Contract,
    owner_private_key: str,
    request_id: int,
    result_bytes: bytes,
) -> str:
    """``fulfillRequest`` firmado por el owner del contrato."""
    account = Account.from_key(owner_private_key)
    chain_id = w3.eth.chain_id

    tx = contract.functions.fulfillRequest(request_id, result_bytes).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 800_000,
            "chainId": chain_id,
        },
    )
    _apply_fee_fields(w3, tx)
    gas_est = w3.eth.estimate_gas(tx)
    tx["gas"] = int(gas_est * 1.2) + 50_000

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    th = receipt["transactionHash"]
    return Web3.to_hex(th) if th is not None else ""


def is_oracle_ready(settings: Any) -> bool:
    """True si hay RPC, contrato y clave para firmar ``requestPrediction``."""
    return bool(
        settings.SEPOLIA_RPC_URL
        and settings.COHORT_ORACLE_ADDRESS
        and settings.ORACLE_REQUESTER_PRIVATE_KEY,
    )
