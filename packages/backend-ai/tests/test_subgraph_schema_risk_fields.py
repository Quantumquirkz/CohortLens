"""Verify Aave v3 subgraph schema includes risk-oriented User fields."""

from __future__ import annotations

from pathlib import Path


def test_user_entity_has_lifetime_fields() -> None:
    root = Path(__file__).resolve().parents[3]
    schema = (
        root
        / "packages"
        / "indexers"
        / "protocols"
        / "aave-v3"
        / "polygon"
        / "schema.graphql"
    )
    text = schema.read_text(encoding="utf-8")
    assert "firstActivityBlock" in text
    assert "totalDepositVolume" in text
