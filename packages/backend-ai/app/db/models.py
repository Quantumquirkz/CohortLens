"""ORM models."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LensRecord(Base):
    """Local cache of lenses registered on CohortRegistry."""

    __tablename__ = "lenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    owner: Mapped[str] = mapped_column(String(42), index=True)
    name: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text(), default="")
    cid: Mapped[str] = mapped_column(String(256))
    price_per_query_wei: Mapped[int] = mapped_column(BigInteger(), default=0)
    model_format: Mapped[str] = mapped_column(String(16))
    model_type: Mapped[str] = mapped_column(String(128), default="")
    active: Mapped[bool] = mapped_column(Boolean(), default=True)
    chain_tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
