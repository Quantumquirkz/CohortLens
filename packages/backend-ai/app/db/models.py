"""ORM models."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LensRecord(Base):
    """Local cache of lenses registered on CohortRegistry."""

    __tablename__ = "lenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    owner: Mapped[str] = mapped_column(String(42), index=True)
    name: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text(), default="")
    cid: Mapped[str] = mapped_column(String(256))
    hf_repo_id: Mapped[str | None] = mapped_column(String(256), nullable=True, default=None)
    price_per_query_wei: Mapped[int] = mapped_column(BigInteger(), default=0)
    model_format: Mapped[str] = mapped_column(String(16))
    model_type: Mapped[str] = mapped_column(String(128), default="")
    active: Mapped[bool] = mapped_column(Boolean(), default=True)
    chain_tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class FeatureSnapshot(Base):
    """Vector of subgraph-derived features for a screening window."""

    __tablename__ = "feature_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    chain_id: Mapped[str] = mapped_column(String(64), index=True)
    address: Mapped[str] = mapped_column(String(42), index=True)
    window_start_block: Mapped[int] = mapped_column(BigInteger())
    window_end_block: Mapped[int] = mapped_column(BigInteger())
    features: Mapped[dict[str, Any]] = mapped_column(JSON)
    subgraph_block_head: Mapped[int | None] = mapped_column(BigInteger(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )


class RiskBatchJob(Base):
    """Async batch risk scoring job."""

    __tablename__ = "risk_batch_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    chain_id: Mapped[str] = mapped_column(String(64))
    client_profile: Mapped[str] = mapped_column(String(32))
    addresses: Mapped[list[Any]] = mapped_column(JSON)
    window_preset: Mapped[str | None] = mapped_column(String(32), nullable=True)
    window_from_block: Mapped[int | None] = mapped_column(BigInteger(), nullable=True)
    window_to_block: Mapped[int | None] = mapped_column(BigInteger(), nullable=True)
    webhook_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    callback_secret: Mapped[str | None] = mapped_column(String(256), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="queued")
    processed: Mapped[int] = mapped_column(Integer(), default=0)
    total: Mapped[int] = mapped_column(Integer())
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    results: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class RiskDecision(Base):
    """Single screening outcome (online or batch)."""

    __tablename__ = "risk_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    correlation_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    batch_job_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("risk_batch_jobs.id", ondelete="SET NULL"),
        nullable=True,
    )
    chain_id: Mapped[str] = mapped_column(String(64), index=True)
    address: Mapped[str] = mapped_column(String(42), index=True)
    risk_score: Mapped[int] = mapped_column(Integer())
    severity: Mapped[str] = mapped_column(String(16))
    recommended_action: Mapped[str] = mapped_column(String(48))
    model_version: Mapped[str] = mapped_column(String(64))
    ruleset_version: Mapped[str] = mapped_column(String(64))
    risk_reasons: Mapped[list[Any]] = mapped_column(JSON)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSON)
    feature_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("feature_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )
    latency_ms: Mapped[int] = mapped_column(Integer())
    degraded: Mapped[bool] = mapped_column(Boolean(), default=False)
    client_profile: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )


class RiskCase(Base):
    """Compliance case tied to a wallet (chain-scoped)."""

    __tablename__ = "risk_cases"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    chain_id: Mapped[str] = mapped_column(String(64), index=True)
    address: Mapped[str] = mapped_column(String(42), index=True)
    status: Mapped[str] = mapped_column(String(24), index=True)
    analyst_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latest_decision_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("risk_decisions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    notes: Mapped[list["RiskCaseNote"]] = relationship(
        "RiskCaseNote",
        back_populates="case",
        cascade="all, delete-orphan",
    )


class RiskCaseNote(Base):
    """Analyst note / audit entry."""

    __tablename__ = "risk_case_notes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("risk_cases.id", ondelete="CASCADE"),
        index=True,
    )
    author: Mapped[str] = mapped_column(String(128))
    body: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    case: Mapped["RiskCase"] = relationship("RiskCase", back_populates="notes")


class AmlWebhookEndpoint(Base):
    """Registered outbound webhook for alert delivery."""

    __tablename__ = "aml_webhook_endpoints"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    target_url: Mapped[str] = mapped_column(String(512))
    events: Mapped[list[Any]] = mapped_column(JSON)
    signing_secret: Mapped[str] = mapped_column(String(256))
    active: Mapped[bool] = mapped_column(Boolean(), default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )


class AmlAlertDelivery(Base):
    """Outbound webhook attempt log."""

    __tablename__ = "aml_alert_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    webhook_endpoint_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("aml_webhook_endpoints.id", ondelete="CASCADE"),
        index=True,
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(24))
    attempts: Mapped[int] = mapped_column(Integer(), default=0)
    last_error: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
