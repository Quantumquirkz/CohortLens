"""Cliente GraphQL para consultar el subgraph indexado (Aave v3)."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Any, TypedDict

import httpx

from app.core.config import settings


class GraphClientError(RuntimeError):
    """Error al consultar el subgraph o al interpretar la respuesta GraphQL."""


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
        raise GraphClientError(f"Importe inválido del subgraph: {amount_str!r}") from e


async def _fetch_entity_pages(
    client: httpx.AsyncClient,
    entity: str,
    start_block: int,
    end_block: int,
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
        resp = await client.post(settings.SUBGRAPH_URL, json=payload)
        resp.raise_for_status()
        body = resp.json()
        if "errors" in body and body["errors"]:
            raise GraphClientError(str(body["errors"]))
        data = body.get("data") or {}
        batch = data.get(entity) or []
        if not isinstance(batch, list):
            raise GraphClientError(f"Respuesta inesperada para {entity}")
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
) -> list[dict[str, Any]]:
    """Obtiene usuarios con métricas agregadas en el rango de bloques (subgraph Aave v3).

    Claves por usuario: ``address``, ``tx_count``, ``volume`` (suma de importes en unidades de token),
    ``avg_gas`` (media de gas por transacción indexada; puede ser 0 si el subgrafo no rellena gas).
    """
    if protocol.lower() not in ("aave", "aave-v3", "aave_v3"):
        raise GraphClientError(
            f"Protocolo no soportado para subgraph: {protocol!r}. Usa aave-v3.",
        )
    if start_block > end_block:
        raise GraphClientError("start_block no puede ser mayor que end_block")

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
            rows = await _fetch_entity_pages(client, entity, start_block, end_block)
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
