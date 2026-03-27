"""Subgraph queries for AML / risk feature extraction (Aave v3)."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, TypedDict

import httpx

from app.core.config import settings
from app.services.graph_client import GraphClientError, _wei_to_decimal

log = logging.getLogger(__name__)

USER_RISK_STATS_QUERY = """
query UserRiskStats($id: ID!) {
  user(id: $id) {
    id
    firstActivityBlock
    lastActivityBlock
    depositCount
    withdrawCount
    borrowCount
    repayCount
    totalDepositVolume
    totalWithdrawVolume
    totalBorrowVolume
    totalRepayVolume
  }
}
"""

_META_BLOCK_QUERY = """
query MetaBlock {
  _meta {
    block {
      number
    }
  }
}
"""

# Paginated ops for a user in [start, end] block range (by entity type).
_DEPOSITS_USER_WINDOW = """
query Win($user: String!, $start: BigInt!, $end: BigInt!, $first: Int!, $skip: Int!) {
  deposits(
    skip: $skip
    first: $first
    orderBy: blockNumber
    orderDirection: asc
    where: { user: $user, blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    reserve
    txHash
    gasUsed
  }
}
"""

_WITHDRAWALS_USER_WINDOW = """
query Win($user: String!, $start: BigInt!, $end: BigInt!, $first: Int!, $skip: Int!) {
  withdrawals(
    skip: $skip
    first: $first
    orderBy: blockNumber
    orderDirection: asc
    where: { user: $user, blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    reserve
    to
    txHash
    gasUsed
  }
}
"""

_BORROWS_USER_WINDOW = """
query Win($user: String!, $start: BigInt!, $end: BigInt!, $first: Int!, $skip: Int!) {
  borrows(
    skip: $skip
    first: $first
    orderBy: blockNumber
    orderDirection: asc
    where: { user: $user, blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    reserve
    txHash
    gasUsed
  }
}
"""

_REPAYS_USER_WINDOW = """
query Win($user: String!, $start: BigInt!, $end: BigInt!, $first: Int!, $skip: Int!) {
  repayments(
    skip: $skip
    first: $first
    orderBy: blockNumber
    orderDirection: asc
    where: { user: $user, blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    reserve
    repayer
    txHash
    gasUsed
  }
}
"""


class UserRiskLifetime(TypedDict, total=False):
    id: str
    firstActivityBlock: str | None
    lastActivityBlock: str | None
    depositCount: str | None
    withdrawCount: str | None
    borrowCount: str | None
    repayCount: str | None
    totalDepositVolume: str | None
    totalWithdrawVolume: str | None
    totalBorrowVolume: str | None
    totalRepayVolume: str | None


def normalize_subgraph_user_id(address: str) -> str:
    a = address.strip().lower()
    if not a.startswith("0x"):
        a = "0x" + a
    return a


async def fetch_meta_block_number(
    client: httpx.AsyncClient,
    subgraph_url: str,
) -> int:
    payload = {"query": _META_BLOCK_QUERY}
    resp = await client.post(subgraph_url, json=payload)
    resp.raise_for_status()
    body = resp.json()
    if body.get("errors"):
        raise GraphClientError(str(body["errors"]))
    meta = (body.get("data") or {}).get("_meta") or {}
    block = meta.get("block") or {}
    num = block.get("number")
    if num is None:
        raise GraphClientError("Subgraph _meta.block.number missing")
    return int(num)


async def fetch_user_lifetime_row(
    subgraph_url: str,
    address: str,
) -> UserRiskLifetime | None:
    uid = normalize_subgraph_user_id(address)
    timeout = httpx.Timeout(settings.SUBGRAPH_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(timeout=timeout) as client:
        payload = {"query": USER_RISK_STATS_QUERY, "variables": {"id": uid}}
        resp = await client.post(subgraph_url, json=payload)
        resp.raise_for_status()
        body = resp.json()
        if body.get("errors"):
            raise GraphClientError(str(body["errors"]))
        user = (body.get("data") or {}).get("user")
        if user is None:
            return None
        return user  # type: ignore[return-value]


def _bigint_str(v: str | None) -> int:
    if v is None or v == "":
        return 0
    return int(v)


async def _fetch_window_ops_pages(
    client: httpx.AsyncClient,
    subgraph_url: str,
    query: str,
    entity_key: str,
    user_id: str,
    start_blk: int,
    end_blk: int,
    max_rows: int,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    skip = 0
    first = min(500, settings.SUBGRAPH_PAGE_SIZE)
    start_s, end_s = str(start_blk), str(end_blk)

    while len(out) < max_rows:
        payload = {
            "query": query,
            "variables": {
                "user": user_id,
                "start": start_s,
                "end": end_s,
                "first": first,
                "skip": skip,
            },
        }
        resp = await client.post(subgraph_url, json=payload)
        resp.raise_for_status()
        body = resp.json()
        if body.get("errors"):
            raise GraphClientError(str(body["errors"]))
        batch = (body.get("data") or {}).get(entity_key) or []
        if not isinstance(batch, list):
            raise GraphClientError(f"Bad batch for {entity_key}")
        out.extend(batch)  # type: ignore[arg-type]
        if len(batch) < first:
            break
        skip += first

    if len(out) >= max_rows:
        log.warning(
            "Window op row cap reached for %s user=%s: %s",
            entity_key,
            user_id,
            max_rows,
        )
    return out[:max_rows]


async def fetch_user_window_features(
    subgraph_url: str,
    address: str,
    window_start_block: int,
    window_end_block: int,
    max_ops_per_type: int = 2000,
) -> dict[str, Any]:
    """Aggregate tx_count, volume, counterparties (reserves + withdrawal to + repayer) for window."""
    uid = normalize_subgraph_user_id(address)
    timeout = httpx.Timeout(settings.SUBGRAPH_TIMEOUT_SECONDS)

    deposits: list[dict[str, Any]] = []
    withdrawals: list[dict[str, Any]] = []
    borrows: list[dict[str, Any]] = []
    repayments: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=timeout) as client:
        deposits = await _fetch_window_ops_pages(
            client,
            subgraph_url,
            _DEPOSITS_USER_WINDOW,
            "deposits",
            uid,
            window_start_block,
            window_end_block,
            max_ops_per_type,
        )
        withdrawals = await _fetch_window_ops_pages(
            client,
            subgraph_url,
            _WITHDRAWALS_USER_WINDOW,
            "withdrawals",
            uid,
            window_start_block,
            window_end_block,
            max_ops_per_type,
        )
        borrows = await _fetch_window_ops_pages(
            client,
            subgraph_url,
            _BORROWS_USER_WINDOW,
            "borrows",
            uid,
            window_start_block,
            window_end_block,
            max_ops_per_type,
        )
        repayments = await _fetch_window_ops_pages(
            client,
            subgraph_url,
            _REPAYS_USER_WINDOW,
            "repayments",
            uid,
            window_start_block,
            window_end_block,
            max_ops_per_type,
        )

    tx_count = len(deposits) + len(withdrawals) + len(borrows) + len(repayments)
    volume = Decimal(0)
    gas_sum = Decimal(0)
    reserves: set[str] = set()
    counterpart_bytes: set[str] = set()
    tx_hashes: list[str] = []

    for row in deposits:
        volume += _wei_to_decimal(str(row.get("amount") or "0"))
        gas_sum += Decimal(str(row.get("gasUsed") or "0"))
        r = row.get("reserve")
        if r:
            reserves.add(str(r).lower())
        th = row.get("txHash")
        if th:
            tx_hashes.append(str(th).lower())

    for row in withdrawals:
        volume += _wei_to_decimal(str(row.get("amount") or "0"))
        gas_sum += Decimal(str(row.get("gasUsed") or "0"))
        r = row.get("reserve")
        if r:
            reserves.add(str(r).lower())
        t = row.get("to")
        if t:
            counterpart_bytes.add(str(t).lower())
        th = row.get("txHash")
        if th:
            tx_hashes.append(str(th).lower())

    for row in borrows:
        volume += _wei_to_decimal(str(row.get("amount") or "0"))
        gas_sum += Decimal(str(row.get("gasUsed") or "0"))
        r = row.get("reserve")
        if r:
            reserves.add(str(r).lower())
        th = row.get("txHash")
        if th:
            tx_hashes.append(str(th).lower())

    for row in repayments:
        volume += _wei_to_decimal(str(row.get("amount") or "0"))
        gas_sum += Decimal(str(row.get("gasUsed") or "0"))
        r = row.get("reserve")
        if r:
            reserves.add(str(r).lower())
        rep = row.get("repayer")
        if rep:
            counterpart_bytes.add(str(rep).lower())
        th = row.get("txHash")
        if th:
            tx_hashes.append(str(th).lower())

    avg_gas = float(gas_sum / tx_count) if tx_count > 0 else 0.0

    # Burstiness proxy: max ops in a single block in window
    per_block: dict[int, int] = {}
    for row in deposits + withdrawals + borrows + repayments:
        bn = row.get("blockNumber")
        if bn is not None:
            ib = int(bn)
            per_block[ib] = per_block.get(ib, 0) + 1
    max_ops_same_block = max(per_block.values()) if per_block else 0

    return {
        "tx_count": tx_count,
        "volume": float(volume),
        "unique_reserves": len(reserves),
        "unique_counterparty_addresses": len(counterpart_bytes),
        "avg_gas_window": avg_gas,
        "max_ops_same_block": max_ops_same_block,
        "sample_tx_hashes": tx_hashes[:20],
    }


def lifetime_row_to_features(row: UserRiskLifetime | None) -> dict[str, float | int | None]:
    """Flatten lifetime User entity for rule engine."""
    if row is None:
        return {}
    return {
        "lifetime_deposit_count": _bigint_str(row.get("depositCount")),
        "lifetime_withdraw_count": _bigint_str(row.get("withdrawCount")),
        "lifetime_borrow_count": _bigint_str(row.get("borrowCount")),
        "lifetime_repay_count": _bigint_str(row.get("repayCount")),
        "lifetime_total_deposit_volume_raw": _bigint_str(row.get("totalDepositVolume")),
        "lifetime_total_withdraw_volume_raw": _bigint_str(row.get("totalWithdrawVolume")),
        "lifetime_total_borrow_volume_raw": _bigint_str(row.get("totalBorrowVolume")),
        "lifetime_total_repay_volume_raw": _bigint_str(row.get("totalRepayVolume")),
        "first_activity_block": _bigint_str(row.get("firstActivityBlock"))
        if row.get("firstActivityBlock")
        else None,
        "last_activity_block": _bigint_str(row.get("lastActivityBlock"))
        if row.get("lastActivityBlock")
        else None,
    }
