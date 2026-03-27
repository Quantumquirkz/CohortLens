"""Heuristic risk scoring and severity mapping for AML / behavior screening."""

from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.core.config import settings

ClientProfile = Literal["exchange", "dapp", "custody"]

Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RecommendedAction = Literal[
    "monitor",
    "limit_amount_frequency",
    "hold_manual_review",
    "block_temp_escalate",
]


class RiskReason(BaseModel):
    code: str
    label: str
    weight: float = 0.0
    severity_contribution: Severity = "LOW"
    features: dict[str, Any] = Field(default_factory=dict)
    rule_or_model: str


def _profile_multiplier(profile: ClientProfile) -> float:
    if profile == "exchange":
        return 1.15
    if profile == "custody":
        return 1.1
    return 1.0


def score_to_severity(score: int) -> tuple[Severity, RecommendedAction]:
    if score <= 24:
        return "LOW", "monitor"
    if score <= 49:
        return "MEDIUM", "limit_amount_frequency"
    if score <= 74:
        return "HIGH", "hold_manual_review"
    return "CRITICAL", "block_temp_escalate"


def apply_heuristic_rules(
    merged_features: dict[str, Any],
    client_profile: ClientProfile,
) -> tuple[int, list[dict[str, Any]], list[str]]:
    """Return raw score 0-100 (before profile multiplier cap), reasons as dicts, tx hash samples."""
    reasons: list[dict[str, Any]] = []
    raw = 0.0
    tx_samples: list[str] = []

    w24 = int(merged_features.get("window_24h_tx_count") or 0)
    v24 = float(merged_features.get("window_24h_volume") or 0.0)
    w7_tx = int(merged_features.get("window_7d_tx_count") or 0)
    v7 = float(merged_features.get("window_7d_volume") or 0.0)
    burst = int(merged_features.get("window_24h_max_ops_same_block") or 0)
    uniq_res_7d = int(merged_features.get("window_7d_unique_reserves") or 0)
    uniq_cp_7d = int(merged_features.get("window_7d_unique_counterparty_addresses") or 0)
    first_blk = merged_features.get("lifetime_first_activity_block")
    head = merged_features.get("subgraph_block_head")
    last_blk = merged_features.get("lifetime_last_activity_block")

    tx_samples = list(merged_features.get("window_24h_sample_tx_hashes") or [])[:10]

    if w24 >= 80:
        reasons.append(
            RiskReason(
                code="VELOCITY_SPIKE",
                label="Very high Aave operation count in 24h window",
                weight=28.0,
                severity_contribution="HIGH",
                features={"window_24h_tx_count": w24},
                rule_or_model="rule:velocity_spike_v1",
            ).model_dump(),
        )
        raw += 28.0
    elif w24 >= 40:
        reasons.append(
            RiskReason(
                code="ELEVATED_VELOCITY",
                label="Elevated Aave operation count in 24h window",
                weight=15.0,
                severity_contribution="MEDIUM",
                features={"window_24h_tx_count": w24},
                rule_or_model="rule:velocity_elevated_v1",
            ).model_dump(),
        )
        raw += 15.0

    if v7 >= 5_000_000.0:
        reasons.append(
            RiskReason(
                code="HIGH_NOTIONAL_7D",
                label="High summed raw notional across Aave ops in 7d (on-chain units)",
                weight=22.0,
                severity_contribution="HIGH",
                features={"window_7d_volume": v7},
                rule_or_model="rule:notional_7d_v1",
            ).model_dump(),
        )
        raw += 22.0

    if burst >= 5:
        reasons.append(
            RiskReason(
                code="BURST_SAME_BLOCK",
                label="Many Aave operations in a single block (automation / burst)",
                weight=18.0,
                severity_contribution="MEDIUM",
                features={"window_24h_max_ops_same_block": burst},
                rule_or_model="rule:burst_v1",
            ).model_dump(),
        )
        raw += 18.0

    if uniq_res_7d >= 6:
        reasons.append(
            RiskReason(
                code="MANY_RESERVES",
                label="Touches many distinct reserves in 7d",
                weight=12.0,
                severity_contribution="LOW",
                features={"window_7d_unique_reserves": uniq_res_7d},
                rule_or_model="rule:reserve_diversity_v1",
            ).model_dump(),
        )
        raw += 12.0

    if uniq_cp_7d >= 10:
        reasons.append(
            RiskReason(
                code="COUNTERPARTY_FANOUT",
                label="Many distinct counterparties (withdrawal to / repayer) in 7d",
                weight=14.0,
                severity_contribution="MEDIUM",
                features={"window_7d_unique_counterparty_addresses": uniq_cp_7d},
                rule_or_model="rule:counterparty_fanout_v1",
            ).model_dump(),
        )
        raw += 14.0

    if (
        isinstance(first_blk, int)
        and isinstance(head, int)
        and head - first_blk < settings.RISK_BLOCKS_PER_HOUR * 24 * 7
        and w7_tx >= 25
    ):
        reasons.append(
            RiskReason(
                code="NEW_WALLET_HIGH_ACTIVITY",
                label="First on-chain Aave activity recent vs head but high 7d tx count",
                weight=16.0,
                severity_contribution="HIGH",
                features={
                    "lifetime_first_activity_block": first_blk,
                    "window_7d_tx_count": w7_tx,
                },
                rule_or_model="rule:new_wallet_activity_v1",
            ).model_dump(),
        )
        raw += 16.0

    if isinstance(first_blk, int) and isinstance(last_blk, int) and last_blk >= first_blk:
        span = last_blk - first_blk
        if span > 0 and w7_tx > 0:
            density = w7_tx / max(1.0, math.log10(span + 10))
            if density > 5.0:
                reasons.append(
                    RiskReason(
                        code="ACTIVITY_DENSITY",
                        label="High operation density relative to wallet activity span",
                        weight=10.0,
                        severity_contribution="LOW",
                        features={"block_span": span, "window_7d_tx_count": w7_tx},
                        rule_or_model="rule:density_v1",
                    ).model_dump(),
                )
                raw += 10.0

    raw *= _profile_multiplier(client_profile)
    score = int(max(0, min(100, round(raw))))
    if not reasons:
        reasons.append(
            RiskReason(
                code="NO_RULE_HIT",
                label="No heuristic threshold fired (DeFi Aave scope only)",
                weight=0.0,
                severity_contribution="LOW",
                features={"window_24h_tx_count": w24, "window_7d_tx_count": w7_tx},
                rule_or_model="rule:baseline_v1",
            ).model_dump(),
        )

    return score, reasons, tx_samples
