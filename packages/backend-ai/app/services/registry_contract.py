"""Interacción con CohortRegistry (Sepolia)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract

from app.services.blockchain_client import _apply_fee_fields

_ABI_PATH = Path(__file__).resolve().parent.parent / "abis" / "cohort_registry.json"


def _load_abi() -> list[dict[str, Any]]:
    return json.loads(_ABI_PATH.read_text(encoding="utf-8"))


def get_registry_contract(w3: Web3, address: str) -> Contract:
    return w3.eth.contract(address=Web3.to_checksum_address(address), abi=_load_abi())


def register_lens(
    w3: Web3,
    contract: Contract,
    private_key: str,
    name: str,
    description: str,
    model_hash: str,
    price_per_query_wei: int,
) -> tuple[int, str]:
    """Registra un lens y devuelve ``(lens_id, tx_hash)``."""
    account = Account.from_key(private_key)
    chain_id = w3.eth.chain_id

    tx = contract.functions.registerLens(
        name,
        description,
        model_hash,
        price_per_query_wei,
    ).build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 1_500_000,
            "chainId": chain_id,
        },
    )
    _apply_fee_fields(w3, tx)
    gas_est = w3.eth.estimate_gas(tx)
    tx["gas"] = int(gas_est * 1.2) + 80_000

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    lens_id = _parse_lens_id_from_logs(w3, receipt, contract.address)
    th = receipt["transactionHash"]
    tx_hex = Web3.to_hex(th) if th is not None else ""
    return lens_id, tx_hex


def _parse_lens_id_from_logs(w3: Web3, receipt: Any, registry_address: str) -> int:
    reg = w3.eth.contract(address=Web3.to_checksum_address(registry_address), abi=_load_abi())
    for log in receipt["logs"]:
        if log["address"].lower() != registry_address.lower():
            continue
        try:
            decoded = reg.events.LensRegistered().process_log(log)  # type: ignore[union-attr]
        except Exception:
            continue
        args = decoded["args"] if isinstance(decoded, dict) else getattr(decoded, "args", None)
        if args is None:
            continue
        lid = args["id"] if isinstance(args, dict) else getattr(args, "id", None)
        if lid is not None:
            return int(lid)
    msg = "No se encontró LensRegistered en el recibo"
    raise RuntimeError(msg)


def get_lens(w3: Web3, contract: Contract, lens_id: int) -> dict[str, Any]:
    """Devuelve el struct Lens como dict de Python."""
    t = contract.functions.getLens(lens_id).call()
    if isinstance(t, (list, tuple)) and len(t) >= 8:
        return {
            "id": int(t[0]),
            "owner": t[1],
            "name": t[2],
            "description": t[3],
            "modelHash": t[4],
            "pricePerQuery": int(t[5]),
            "active": bool(t[6]),
            "createdAt": int(t[7]),
        }
    return {
        "id": int(getattr(t, "id")),
        "owner": getattr(t, "owner"),
        "name": getattr(t, "name"),
        "description": getattr(t, "description"),
        "modelHash": getattr(t, "modelHash"),
        "pricePerQuery": int(getattr(t, "pricePerQuery")),
        "active": bool(getattr(t, "active")),
        "createdAt": int(getattr(t, "createdAt")),
    }


def lens_count(w3: Web3, contract: Contract) -> int:
    return int(contract.functions.lensCount().call())
