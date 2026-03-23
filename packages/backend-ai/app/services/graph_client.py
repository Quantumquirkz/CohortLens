"""GraphQL client for the indexed subgraph (Aave v3)."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Any, TypedDict

import httpx

from app.core.config import settings


class GraphClientError(RuntimeError):
    """Error querying the subgraph or parsing the GraphQL response."""


class _UserRef(TypedDict):
    id: str


class _OpRow(TypedDict, total=False):
    id: str
    amount: str
    blockNumber: str
    gasUsed: str
    user: _UserRef | None


_ENTITY_QUERIES: dict[str, str] = {
    "deposits": """
query Page($skip: Int!, $first: Int!, $start: BigInt!, $end: BigInt!) {
  deposits(
    skip: $skip
    first: $first
    orderBy: id
    orderDirection: asc
    where: { blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    gasUsed
    user { id }
  }
}
""",
    "withdrawals": """
query Page($skip: Int!, $first: Int!, $start: BigInt!, $end: BigInt!) {
  withdrawals(
    skip: $skip
    first: $first
    orderBy: id
    orderDirection: asc
    where: { blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    gasUsed
    user { id }
  }
}
""",
    "borrows": """
query Page($skip: Int!, $first: Int!, $start: BigInt!, $end: BigInt!) {
  borrows(
    skip: $skip
    first: $first
    orderBy: id
    orderDirection: asc
    where: { blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    gasUsed
    user { id }
  }
}
""",
    "repayments": """
query Page($skip: Int!, $first: Int!, $start: BigInt!, $end: BigInt!) {
  repayments(
    skip: $skip
    first: $first
    orderBy: id
    orderDirection: asc
    where: { blockNumber_gte: $start, blockNumber_lte: $end }
  ) {
    id
    amount
    blockNumber
    gasUsed
    user { id }
  }
}
""",
}


def _wei_to_decimal(amount_str: str) -> Decimal:
    try:
        return Decimal(amount_str) / Decimal(10**18)
    except Exception as e:
        raise GraphClientError(f"Invalid subgraph amount: {amount_str!r}") from e


async def _fetch_entity_pages(
    client: httpx.AsyncClient,
    entity: str,
    start_block: int,
    end_block: int,
    subgraph_url: str,
) -> list[_OpRow]:
    query = _ENTITY_QUERIES[entity]
    out: list[_OpRow] = []
    skip = 0
    first = settings.SUBGRAPH_PAGE_SIZE
    start_s = str(start_block)
    end_s = str(end_block)

    while True:
        payload: dict[str, Any] = {
            "query": query,
            "variables": {
                "skip": skip,
                "first": first,
                "start": start_s,
                "end": end_s,
            },
        }
        resp = await client.post(subgraph_url, json=payload)
        resp.raise_for_status()
        body = resp.json()
        if "errors" in body and body["errors"]:
            raise GraphClientError(str(body["errors"]))
        data = body.get("data") or {}
        batch = data.get(entity) or []
        if not isinstance(batch, list):
            raise GraphClientError(f"Unexpected response for entity {entity}")
        for row in batch:
            out.append(row)  # type: ignore[arg-type]
        if len(batch) < first:
            break
        skip += first

    return out


async def fetch_user_metrics_for_block_range(
    start_block: int,
    end_block: int,
    protocol: str,
    subgraph_url: str | None = None,
) -> list[dict[str, Any]]:
    """Fetch users with aggregated metrics for the block range (Aave v3 subgraph).

    Per user: ``address``, ``tx_count``, ``volume`` (sum of amounts in token units),
    ``avg_gas`` (average gas per indexed tx; may be 0 if the subgraph does not fill gas).
    """
    if protocol.lower() not in ("aave", "aave-v3", "aave_v3"):
        raise GraphClientError(
            f"Unsupported subgraph protocol: {protocol!r}. Use aave-v3.",
        )
    if start_block > end_block:
        raise GraphClientError("start_block cannot be greater than end_block")

    endpoint = subgraph_url if subgraph_url is not None else settings.SUBGRAPH_URL

    metrics: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {
            "tx_count": Decimal(0),
            "volume": Decimal(0),
            "gas_sum": Decimal(0),
        },
    )

    timeout = httpx.Timeout(settings.SUBGRAPH_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for entity in _ENTITY_QUERIES:
            rows = await _fetch_entity_pages(
                client,
                entity,
                start_block,
                end_block,
                endpoint,
            )
            for row in rows:
                user = row.get("user")
                if not user or not user.get("id"):
                    continue
                addr = str(user["id"]).lower()
                amount_s = row.get("amount") or "0"
                gas_s = row.get("gasUsed") or "0"
                m = metrics[addr]
                m["tx_count"] += Decimal(1)
                m["volume"] += _wei_to_decimal(amount_s)
                m["gas_sum"] += Decimal(gas_s)

    users: list[dict[str, Any]] = []
    for address, m in metrics.items():
        tx_c = int(m["tx_count"])
        avg_gas = float(m["gas_sum"] / m["tx_count"]) if m["tx_count"] > 0 else 0.0
        users.append(
            {
                "address": address,
                "tx_count": float(tx_c),
                "volume": float(m["volume"]),
                "avg_gas": avg_gas,
            },
        )
    return users
