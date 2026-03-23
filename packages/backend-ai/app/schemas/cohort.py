"""Schemas for cohort discovery API."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class UserProfile(BaseModel):
    """Per-user profile with address and feature vector."""

    address: str
    features: dict[str, float]


class Cohort(BaseModel):
    """A cluster of users with centroid and optional user list."""

    id: int
    size: int
    center: dict[str, float]
    users: Optional[list[UserProfile]] = None


def _default_features() -> list[str]:
    return ["tx_count", "volume", "avg_gas"]


class CohortRequest(BaseModel):
    """Request body for cohort discovery."""

    protocol: str
    start_block: int
    end_block: int
    num_clusters: int = Field(default=3, ge=1, le=200, description="Number of K-Means clusters")
    features: list[str] = Field(
        default_factory=_default_features,
        description="Feature names for clustering",
    )

    @field_validator("features")
    @classmethod
    def features_not_empty(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("features cannot be empty")
        return v


class CohortResponse(BaseModel):
    """Response with discovered cohorts and total user count."""

    cohorts: list[Cohort]
    total_users: int
    oracle_request_id: int | None = Field(
        default=None,
        description="ID de petición en CohortOracle (Sepolia), si se envió on-chain",
    )
    oracle_tx_hash: str | None = Field(
        default=None,
        description="Hash de la transacción requestPrediction, si aplica",
    )
