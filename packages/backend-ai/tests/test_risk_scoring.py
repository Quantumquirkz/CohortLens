"""Unit tests for heuristic risk scoring (no FastAPI)."""

from __future__ import annotations

from app.services.risk_scoring import apply_heuristic_rules, score_to_severity


def test_score_to_severity_low() -> None:
    sev, act = score_to_severity(10)
    assert sev == "LOW"
    assert act == "monitor"


def test_score_to_severity_critical() -> None:
    sev, act = score_to_severity(90)
    assert sev == "CRITICAL"
    assert act == "block_temp_escalate"


def test_apply_rules_no_hit_baseline() -> None:
    features = {
        "window_24h_tx_count": 0,
        "window_24h_volume": 0.0,
        "window_7d_tx_count": 0,
        "window_7d_volume": 0.0,
        "window_24h_max_ops_same_block": 0,
        "window_7d_unique_reserves": 0,
        "window_7d_unique_counterparty_addresses": 0,
    }
    score, reasons, _ = apply_heuristic_rules(features, "dapp")
    assert score == 0
    assert any(r.get("code") == "NO_RULE_HIT" for r in reasons)


def test_velocity_spike_exchange_stricter() -> None:
    features = {
        "window_24h_tx_count": 100,
        "window_24h_volume": 0.0,
        "window_7d_tx_count": 100,
        "window_7d_volume": 0.0,
        "window_24h_max_ops_same_block": 0,
        "window_7d_unique_reserves": 0,
        "window_7d_unique_counterparty_addresses": 0,
    }
    s_dapp, _, _ = apply_heuristic_rules(features, "dapp")
    s_ex, _, _ = apply_heuristic_rules(features, "exchange")
    assert s_ex >= s_dapp
