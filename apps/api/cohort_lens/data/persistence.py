"""Persist segments and predictions to Neon DB."""

import json
from typing import Optional

import pandas as pd
from sqlalchemy import text

from cohort_lens.data.audit import write_audit_log
from cohort_lens.data.db import get_engine, create_schema
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)

_MODEL_VERSION = "v1.0.0"


def set_model_version(version: str) -> None:
    """Set the current model version for persistence."""
    global _MODEL_VERSION
    _MODEL_VERSION = version


def get_model_version() -> str:
    """Get the current model version."""
    return _MODEL_VERSION


def persist_segments(
    df: pd.DataFrame,
    model_version: Optional[str] = None,
    user_id: Optional[str] = None,
) -> int:
    """
    Persist segmentation results to the `segments` table in Neon DB.

    Args:
        df: DataFrame with 'CustomerID' and 'Cluster' columns.
        model_version: Version identifier for the segmentation model.
        user_id: User who triggered the segmentation (for audit).

    Returns:
        Number of rows persisted.
    """
    if "Cluster" not in df.columns or "CustomerID" not in df.columns:
        logger.warning("persist_segments: missing 'Cluster' or 'CustomerID' columns")
        return 0

    version = model_version or _MODEL_VERSION
    count = 0

    try:
        engine = get_engine()
        create_schema(engine)

        with engine.connect() as conn:
            for _, row in df.iterrows():
                conn.execute(
                    text("""
                    INSERT INTO segments (customer_id, cluster, model_version)
                    VALUES (:customer_id, :cluster, :model_version)
                    """),
                    {
                        "customer_id": str(row["CustomerID"]),
                        "cluster": int(row["Cluster"]),
                        "model_version": version,
                    },
                )
                count += 1
            conn.commit()

        logger.info("Persisted %d segment rows (model_version=%s)", count, version)

        # Audit log
        try:
            write_audit_log(
                table_name="segments",
                record_id=f"batch_{count}",
                action="INSERT",
                new_values={"count": count, "model_version": version},
                user_id=user_id,
            )
        except Exception:
            pass

    except Exception as e:
        logger.warning("Failed to persist segments: %s", e)

    return count


def persist_prediction(
    customer_id: str,
    predicted_spending: float,
    features: Optional[dict] = None,
    model_version: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    """
    Persist a single prediction to the `predictions` table in Neon DB.

    Args:
        customer_id: The customer identifier.
        predicted_spending: The predicted spending score.
        features: Feature snapshot used for the prediction.
        model_version: Model version identifier.
        user_id: User who triggered the prediction (for audit).

    Returns:
        True on success.
    """
    version = model_version or _MODEL_VERSION

    try:
        engine = get_engine()
        create_schema(engine)

        with engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO predictions (customer_id, predicted_spending, model_version, features_snapshot)
                VALUES (:customer_id, :predicted_spending, :model_version, :features_snapshot)
                """),
                {
                    "customer_id": str(customer_id),
                    "predicted_spending": float(predicted_spending),
                    "model_version": version,
                    "features_snapshot": json.dumps(features) if features else None,
                },
            )
            conn.commit()

        logger.debug(
            "Persisted prediction for customer_id=%s spending=%.1f",
            customer_id,
            predicted_spending,
        )

        # Audit log
        try:
            write_audit_log(
                table_name="predictions",
                record_id=customer_id,
                action="INSERT",
                new_values={
                    "predicted_spending": predicted_spending,
                    "model_version": version,
                },
                user_id=user_id,
            )
        except Exception:
            pass

        return True
    except Exception as e:
        logger.warning("Failed to persist prediction: %s", e)
        return False


def persist_predictions_batch(
    results: list[dict],
    model_version: Optional[str] = None,
    user_id: Optional[str] = None,
) -> int:
    """
    Persist multiple predictions in batch.

    Args:
        results: List of dicts with keys 'customer_id', 'predicted_spending', and optional 'features'.
        model_version: Model version identifier.
        user_id: User who triggered the predictions.

    Returns:
        Number of rows persisted.
    """
    version = model_version or _MODEL_VERSION
    count = 0

    try:
        engine = get_engine()
        create_schema(engine)

        with engine.connect() as conn:
            for r in results:
                conn.execute(
                    text("""
                    INSERT INTO predictions (customer_id, predicted_spending, model_version, features_snapshot)
                    VALUES (:customer_id, :predicted_spending, :model_version, :features_snapshot)
                    """),
                    {
                        "customer_id": str(r["customer_id"]),
                        "predicted_spending": float(r["predicted_spending"]),
                        "model_version": version,
                        "features_snapshot": json.dumps(r.get("features")) if r.get("features") else None,
                    },
                )
                count += 1
            conn.commit()

        logger.info("Persisted %d prediction rows (model_version=%s)", count, version)

        try:
            write_audit_log(
                table_name="predictions",
                record_id=f"batch_{count}",
                action="INSERT",
                new_values={"count": count, "model_version": version},
                user_id=user_id,
            )
        except Exception:
            pass

    except Exception as e:
        logger.warning("Failed to persist predictions batch: %s", e)

    return count
