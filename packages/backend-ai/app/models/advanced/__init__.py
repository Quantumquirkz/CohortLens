"""Types for advanced models (churn, LTV, toxicity)."""

from enum import Enum


class ModelTaskType(str, Enum):
    CHURN = "churn"
    LTV = "ltv"
    TOXICITY = "toxicity"
    GENERIC = "generic"
