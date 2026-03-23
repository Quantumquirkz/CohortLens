"""Tipos para modelos avanzados (churn, LTV, toxicidad)."""

from enum import Enum


class ModelTaskType(str, Enum):
    CHURN = "churn"
    LTV = "ltv"
    TOXICITY = "toxicity"
    GENERIC = "generic"
