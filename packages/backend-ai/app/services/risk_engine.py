"""Orchestrate subgraph reads, cache, scoring, and persistence for risk screening."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import FeatureSnapshot, RiskCase, RiskDecision
from app.services.risk_cache import get_cached_features, set_cached_features
from app.services.risk_graph_client import (
    GraphClientError,
    fetch_meta_block_number,
    fetch_user_lifetime_row,
    fetch_user_window_features,
    lifetime_row_to_features,
)
from app.services.risk_scoring import (
    ClientProfile,
    RecommendedAction,
    Severity,
    apply_heuristic_rules,
    score_to_severity,
)


def _blocks_for_hours(hours: int) -> int:
    return int(hours * settings.RISK_BLOCKS_PER_HOUR)


def _prefix_window(prefix: str, feat: dict[str, Any]) -> dict[str, str | int | float | list]:
    out: dict[str, str | int | float | list] = {}
    for k, v in feat.items():
        key = f"{prefix}_{k}"
        if isinstance(v, (str, int, float, list, dict)):
            out[key] = v  # type: ignore[assignment]
    return out


async def compute_feature_bundle(
    subgraph_url: str,
    chain_id: str,
    address: str,
    *,
    use_cache: bool = True,
) -> tuple[dict[str, Any], int, bool]:
    """Return merged features, subgraph head block, degraded flag."""
    degraded = False
    timeout = httpx.Timeout(min(settings.SUBGRAPH_TIMEOUT_SECONDS, 15.0))
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            head = await fetch_meta_block_number(client, subgraph_url)
        except (GraphClientError, httpx.HTTPError):
            head = 0
            degraded = True

    if head <= 0:
        degraded = True
        merged: dict[str, Any] = {
            "subgraph_block_head": 0,
            "chain_id": chain_id,
            "address": address.lower(),
        }
        return merged, 0, degraded

    if use_cache:
        cached = get_cached_features(chain_id, address, head)
        if cached is not None:
            cached = {**cached, "subgraph_block_head": head}
            return cached, head, degraded

    start_24h = max(0, head - _blocks_for_hours(24))
    start_7d = max(0, head - _blocks_for_hours(24 * 7))

    try:
        lifetime_row = await fetch_user_lifetime_row(subgraph_url, address)
        f24 = await fetch_user_window_features(
            subgraph_url,
            address,
            start_24h,
            head,
        )
        f7 = await fetch_user_window_features(
            subgraph_url,
            address,
            start_7d,
            head,
        )
    except (GraphClientError, httpx.HTTPError):
        degraded = True
        lifetime_row = None
        f24 = {
            "tx_count": 0,
            "volume": 0.0,
            "unique_reserves": 0,
            "unique_counterparty_addresses": 0,
            "avg_gas_window": 0.0,
            "max_ops_same_block": 0,
            "sample_tx_hashes": [],
        }
        f7 = dict(f24)

    lf = lifetime_row_to_features(lifetime_row or {})
    merged = {
        **lf,
        **_prefix_window("window_24h", f24),
        **_prefix_window("window_7d", f7),
        "subgraph_block_head": head,
        "chain_id": chain_id,
        "address": address.lower(),
    }

    if use_cache and not degraded:
        set_cached_features(chain_id, address, head, merged)

    return merged, head, degraded


def persist_screening(
    db: Session,
    *,
    chain_id: str,
    address: str,
    client_profile: ClientProfile,
    correlation_id: str | None,
    risk_score: int,
    severity: Severity,
    action: RecommendedAction,
    risk_reasons: list[dict[str, Any]],
    evidence: dict[str, Any],
    merged_features: dict[str, Any],
    head: int,
    latency_ms: int,
    degraded: bool,
    batch_job_id: uuid.UUID | None = None,
) -> tuple[uuid.UUID, uuid.UUID]:
    """Insert feature snapshot + decision. Optionally link case. Returns decision_id, snapshot_id."""
    w_start = max(
        0,
        int(merged_features.get("subgraph_block_head") or 0) - _blocks_for_hours(24),
    )
    w_end = int(merged_features.get("subgraph_block_head") or 0)

    snap = FeatureSnapshot(
        chain_id=chain_id,
        address=address.lower(),
        window_start_block=w_start,
        window_end_block=w_end,
        features=merged_features,
        subgraph_block_head=head if head > 0 else None,
    )
    db.add(snap)
    db.flush()

    evidence["feature_snapshot_id"] = str(snap.id)
    decision = RiskDecision(
        correlation_id=correlation_id,
        batch_job_id=batch_job_id,
        chain_id=chain_id,
        address=address.lower(),
        risk_score=risk_score,
        severity=severity,
        recommended_action=action,
        model_version=settings.RISK_MODEL_VERSION,
        ruleset_version=settings.RISK_RULESET_VERSION,
        risk_reasons=risk_reasons,
        evidence=dict(evidence),
        feature_snapshot_id=snap.id,
        latency_ms=latency_ms,
        degraded=degraded,
        client_profile=client_profile,
    )
    db.add(decision)
    db.flush()

    if severity in ("MEDIUM", "HIGH", "CRITICAL"):
        existing = (
            db.query(RiskCase)
            .filter(
                RiskCase.chain_id == chain_id,
                RiskCase.address == address.lower(),
                RiskCase.status.in_(("open", "in_review")),
            )
            .first()
        )
        if existing:
            existing.latest_decision_id = decision.id
            existing.updated_at = datetime.now(UTC)
        else:
            case = RiskCase(
                chain_id=chain_id,
                address=address.lower(),
                status="open",
                latest_decision_id=decision.id,
            )
            db.add(case)
            db.flush()

    db.commit()
    return decision.id, snap.id


async def evaluate_risk_for_address(
    subgraph_url: str,
    chain_id: str,
    address: str,
    client_profile: ClientProfile,
    *,
    use_cache: bool = True,
    include_graph_hints: bool = False,
) -> tuple[
    dict[str, Any],
    int,
    int,
    Severity,
    RecommendedAction,
    list[dict[str, Any]],
    dict[str, Any],
    int,
    bool,
]:
    """merged, score, elapsed_ms, severity, action, reasons, evidence, head, degraded."""
    t0 = time.perf_counter()
    merged, head, degraded = await compute_feature_bundle(
        subgraph_url,
        chain_id,
        address,
        use_cache=use_cache,
    )
    score, reasons, tx_samples = apply_heuristic_rules(merged, client_profile)
    severity, action = score_to_severity(score)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    evidence: dict[str, Any] = {
        "window_start_block": max(0, head - _blocks_for_hours(24)),
        "window_end_block": head,
        "subgraph_block_head": head,
        "graph_component_id": None,
        "supporting_tx_ids": tx_samples,
        "explain": f"Heuristic ruleset {settings.RISK_RULESET_VERSION}; Aave v3 subgraph scope.",
    }
    if include_graph_hints:
        evidence["graph_hints"] = {
            "unique_reserves_7d": merged.get("window_7d_unique_reserves"),
            "counterparties_7d": merged.get("window_7d_unique_counterparty_addresses"),
        }
    return merged, score, elapsed_ms, severity, action, reasons, evidence, head, degraded


async def run_online_screen(
    db: Session,
    subgraph_url: str,
    chain_id: str,
    address: str,
    client_profile: ClientProfile,
    correlation_id: str | None,
    include_graph_hints: bool,
) -> dict[str, Any]:
    merged, score, elapsed_ms, severity, action, reasons, evidence, head, degraded = (
        await evaluate_risk_for_address(
            subgraph_url,
            chain_id,
            address,
            client_profile,
            use_cache=True,
            include_graph_hints=include_graph_hints,
        )
    )

    did: uuid.UUID | None = None
    evidence_out = dict(evidence)
    if head > 0:
        did, _snap_id = persist_screening(
            db,
            chain_id=chain_id,
            address=address,
            client_profile=client_profile,
            correlation_id=correlation_id,
            risk_score=score,
            severity=severity,
            action=action,
            risk_reasons=reasons,
            evidence=evidence_out,
            merged_features=merged,
            head=head,
            latency_ms=elapsed_ms,
            degraded=degraded,
        )
    out_corr = correlation_id or (str(did) if did else str(uuid.uuid4()))
    return {
        "correlation_id": out_corr,
        "decision_id": str(did) if did else None,
        "chain_id": chain_id,
        "address": address.lower(),
        "risk_score": score,
        "severity": severity,
        "recommended_action": action,
        "model_version": settings.RISK_MODEL_VERSION,
        "ruleset_version": settings.RISK_RULESET_VERSION,
        "computed_at": datetime.now(UTC).isoformat(),
        "risk_reasons": reasons,
        "evidence": evidence_out,
        "latency_ms": elapsed_ms,
        "degraded": degraded,
    }
