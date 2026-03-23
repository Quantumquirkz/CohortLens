"""web3.py helpers for LENS token, Staking, and paid oracle requests (Phase 7)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from web3 import Web3
from web3.contract import Contract

from app.core.config import ChainConfig

_LOG = logging.getLogger(__name__)

_STAKING_ABI_PATH = Path(__file__).resolve().parent.parent / "abis" / "staking.json"
_LENS_ABI_PATH = Path(__file__).resolve().parent.parent / "abis" / "lenstoken.json"
_REGISTRY_ABI_PATH = Path(__file__).resolve().parent.parent / "abis" / "cohort_registry.json"
_ORACLE_ABI_PATH = Path(__file__).resolve().parent.parent / "abis" / "cohort_oracle.json"


def _load_abi(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def get_staking_contract(w3: Web3, address: str) -> Contract:
    return w3.eth.contract(address=Web3.to_checksum_address(address), abi=_load_abi(_STAKING_ABI_PATH))


def get_lens_token_contract(w3: Web3, address: str) -> Contract:
    return w3.eth.contract(address=Web3.to_checksum_address(address), abi=_load_abi(_LENS_ABI_PATH))


def get_registry_contract_v2(w3: Web3, address: str) -> Contract:
    return w3.eth.contract(address=Web3.to_checksum_address(address), abi=_load_abi(_REGISTRY_ABI_PATH))


def get_oracle_abi() -> list[dict[str, Any]]:
    return _load_abi(_ORACLE_ABI_PATH)


def balance_of_staked(w3: Web3, staking_address: str, account: str) -> int:
    c = get_staking_contract(w3, staking_address)
    return int(c.functions.balanceOfStaked(Web3.to_checksum_address(account)).call())


def min_stake_to_register(w3: Web3, registry_address: str) -> int:
    c = get_registry_contract_v2(w3, registry_address)
    return int(c.functions.minStakeToRegister().call())


def lens_balance_of(w3: Web3, lens_token_address: str, account: str) -> int:
    c = get_lens_token_contract(w3, lens_token_address)
    return int(c.functions.balanceOf(Web3.to_checksum_address(account)).call())


def verify_prediction_payment_tx(
    w3: Web3,
    oracle_address: str,
    tx_hash_hex: str,
    expected_lens_id: int,
    expected_requester: str | None = None,
) -> int:
    """Parse ``PredictionRequested`` from receipt; return ``requestId``.

    Use after the user submitted ``requestPrediction`` on-chain (LENS payment).
    """
    receipt = w3.eth.get_transaction_receipt(Web3.to_bytes(hexstr=tx_hash_hex.strip()))
    oc = w3.eth.contract(address=Web3.to_checksum_address(oracle_address), abi=get_oracle_abi())
    oracle_lower = oracle_address.lower()
    for log in receipt["logs"]:
        if log["address"].lower() != oracle_lower:
            continue
        try:
            decoded = oc.events.PredictionRequested().process_log(log)  # type: ignore[union-attr]
        except Exception:
            continue
        args = decoded["args"] if isinstance(decoded, dict) else getattr(decoded, "args", None)
        if args is None:
            continue
        if isinstance(args, dict):
            rid = int(args["requestId"])
            lid = int(args["lensId"])
            req = args["requester"]
        else:
            rid = int(getattr(args, "requestId"))
            lid = int(getattr(args, "lensId"))
            req = getattr(args, "requester")
        if lid != expected_lens_id:
            msg = f"lensId mismatch: chain has {lid}, expected {expected_lens_id}"
            raise ValueError(msg)
        if expected_requester is not None and str(req).lower() != expected_requester.lower():
            msg = "requester address does not match payment transaction"
            raise ValueError(msg)
        _LOG.info(
            "discover_paid",
            extra={
                "request_id": rid,
                "lens_id": lid,
                "tx": tx_hash_hex,
            },
        )
        return rid
    msg = "PredictionRequested not found in receipt"
    raise ValueError(msg)


def chain_staking_address(chain: ChainConfig) -> str:
    return (chain.staking_address or "").strip()


def chain_lens_token_address(chain: ChainConfig) -> str:
    return (chain.lens_token_address or "").strip()
