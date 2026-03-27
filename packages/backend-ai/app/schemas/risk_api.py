"""Pydantic schemas for AML risk screening API v1."""

from __future__ import annotations

from typing import Any, Literal

import re

from pydantic import BaseModel, Field, field_validator


class ScreenOptions(BaseModel):
    max_latency_ms: int | None = Field(default=300, ge=50, le=30_000)
    include_graph_hints: bool = False


class RiskScreenRequest(BaseModel):
    chain_id: str = Field(..., min_length=1, max_length=64)
    address: str = Field(..., min_length=42, max_length=42)
    client_profile: Literal["exchange", "dapp", "custody"] = "dapp"
    correlation_id: str | None = Field(default=None, max_length=128)
    options: ScreenOptions | None = None

    @field_validator("address")
    @classmethod
    def normalize_address(cls, v: str) -> str:
        a = v.strip().lower()
        if not re.fullmatch(r"0x[a-f0-9]{40}", a):
            raise ValueError("address must be 0x-prefixed 20-byte hex")
        return a

    @field_validator("chain_id")
    @classmethod
    def lower_chain(cls, v: str) -> str:
        return v.strip().lower()


class RiskScreenResponse(BaseModel):
    correlation_id: str
    decision_id: str | None = None
    chain_id: str
    address: str
    risk_score: int
    severity: str
    recommended_action: str
    model_version: str
    ruleset_version: str
    computed_at: str
    risk_reasons: list[dict[str, Any]]
    evidence: dict[str, Any]
    latency_ms: int
    degraded: bool = False


class BatchWindow(BaseModel):
    from_block: int | None = None
    to_block: int | None = None
    preset: Literal["last_30d", "last_7d"] | None = None


class RiskBatchRequest(BaseModel):
    chain_id: str
    client_profile: Literal["exchange", "dapp", "custody"] = "dapp"
    addresses: list[str] = Field(..., min_length=1)
    window: BatchWindow | None = None
    webhook_url: str | None = None
    callback_secret: str | None = None


class RiskBatchAccepted(BaseModel):
    job_id: str
    status: Literal["queued"] = "queued"


class RiskBatchStatusResponse(BaseModel):
    job_id: str
    status: str
    processed: int
    total: int
    error_message: str | None = None
    results: list[dict[str, Any]] | None = None


class AlertWebhookRegisterRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1, max_length=128)
    target_url: str = Field(..., min_length=8, max_length=512)
    events: list[str] = Field(
        ...,
        description="e.g. severity_ge_medium, case_opened",
    )
    signing_secret: str = Field(..., min_length=8, max_length=256)


class AlertWebhookRegisterResponse(BaseModel):
    webhook_id: str
    status: Literal["active"] = "active"


class RiskCaseNoteCreate(BaseModel):
    author: str = Field(..., min_length=1, max_length=128)
    body: str = Field(..., min_length=1, max_length=8000)


class RiskCasePatch(BaseModel):
    status: Literal["open", "in_review", "resolved", "false_positive"] | None = None
    analyst_label: Literal["true_positive", "false_positive", "suspicious", "unknown"] | None = None


class RiskCaseNoteOut(BaseModel):
    id: str
    author: str
    body: str
    created_at: str


class RiskCaseOut(BaseModel):
    id: str
    chain_id: str
    address: str
    status: str
    analyst_label: str | None
    latest_decision_id: str | None
    created_at: str
    updated_at: str


class RiskCaseDetailOut(RiskCaseOut):
    notes: list[RiskCaseNoteOut] = Field(default_factory=list)
