"""Data drift monitoring with PSI and KS tests for CohortLens.

Detects distribution shifts between a baseline (training) dataset and the
current (production) dataset. Exposes metrics that can be used for alerting
or exposed via the API.
"""

import json
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)

# Default significance level for KS test
KS_ALPHA = 0.05
# Default PSI threshold: > 0.2 indicates significant drift
PSI_THRESHOLD = 0.2


def _compute_psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    """
    Compute Population Stability Index (PSI) between two distributions.

    PSI < 0.1  → no significant shift
    0.1 ≤ PSI < 0.2 → moderate shift
    PSI ≥ 0.2  → significant shift

    Args:
        expected: Baseline (training) values.
        actual: Current (production) values.
        bins: Number of bins for histogram.

    Returns:
        PSI value (float).
    """
    # Create bin edges from the expected distribution
    eps = 1e-4
    breakpoints = np.linspace(
        min(expected.min(), actual.min()) - eps,
        max(expected.max(), actual.max()) + eps,
        bins + 1,
    )

    expected_counts = np.histogram(expected, bins=breakpoints)[0].astype(float)
    actual_counts = np.histogram(actual, bins=breakpoints)[0].astype(float)

    # Normalize to proportions
    expected_pct = expected_counts / expected_counts.sum()
    actual_pct = actual_counts / actual_counts.sum()

    # Avoid division by zero and log(0)
    expected_pct = np.clip(expected_pct, eps, 1.0)
    actual_pct = np.clip(actual_pct, eps, 1.0)

    psi = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(psi)


def _compute_ks(expected: np.ndarray, actual: np.ndarray) -> dict:
    """
    Compute Kolmogorov-Smirnov test statistic and p-value.

    Args:
        expected: Baseline values.
        actual: Current values.

    Returns:
        Dict with 'statistic', 'p_value', and 'drift_detected' (at KS_ALPHA).
    """
    try:
        from scipy.stats import ks_2samp

        stat, p_value = ks_2samp(expected, actual)
        return {
            "statistic": float(stat),
            "p_value": float(p_value),
            "drift_detected": p_value < KS_ALPHA,
        }
    except ImportError:
        logger.debug("scipy not installed, KS test unavailable")
        return {"statistic": 0.0, "p_value": 1.0, "drift_detected": False}


def save_baseline(df: pd.DataFrame, baseline_path: Path) -> None:
    """
    Save baseline feature statistics for future drift comparison.

    Args:
        df: Training DataFrame.
        baseline_path: Path to save JSON baseline.
    """
    numeric = df.select_dtypes(include=["number"])
    baseline = {}
    for col in numeric.columns:
        values = numeric[col].dropna().values
        baseline[col] = {
            "mean": float(np.mean(values)),
            "std": float(np.std(values)),
            "min": float(np.min(values)),
            "max": float(np.max(values)),
            "median": float(np.median(values)),
            "values": values.tolist(),  # Store raw values for PSI/KS
        }

    baseline_path = Path(baseline_path)
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    baseline_path.write_text(json.dumps(baseline, indent=2), encoding="utf-8")
    logger.info("Baseline saved to %s (%d features)", baseline_path, len(baseline))


def _load_baseline(baseline_path: Path) -> Optional[dict]:
    """Load baseline from JSON file."""
    baseline_path = Path(baseline_path)
    if not baseline_path.exists():
        return None
    try:
        return json.loads(baseline_path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning("Failed to load baseline: %s", e)
        return None


def check_drift(
    current_df: pd.DataFrame,
    baseline_path: Optional[Path] = None,
    psi_threshold: float = PSI_THRESHOLD,
) -> dict:
    """
    Check for data drift against a saved baseline.

    If no baseline exists, returns summary stats and drift_detected=False.
    When a baseline is available, computes PSI and KS for each numeric feature.

    Args:
        current_df: Current production DataFrame.
        baseline_path: Path to baseline JSON file (default: data/processed/baseline.json).
        psi_threshold: PSI threshold for drift detection (default 0.2).

    Returns:
        Dict with per-feature drift metrics, overall drift status, and alerts.
    """
    from cohort_lens.utils.config_reader import get_project_root

    if baseline_path is None:
        baseline_path = get_project_root() / "data" / "processed" / "baseline.json"

    numeric = current_df.select_dtypes(include=["number"])
    current_stats = {
        col: {"mean": float(numeric[col].mean()), "std": float(numeric[col].std())}
        for col in numeric.columns
    }

    baseline = _load_baseline(baseline_path)
    if baseline is None:
        logger.info("No baseline found at %s. Returning current stats only.", baseline_path)
        return {
            "feature_stats": current_stats,
            "drift_detected": False,
            "message": "No baseline available. Save a baseline first with save_baseline().",
        }

    # Compare each feature
    feature_reports = {}
    any_drift = False
    alerts = []

    for col in numeric.columns:
        if col not in baseline:
            continue

        current_values = numeric[col].dropna().values
        baseline_values = np.array(baseline[col].get("values", []))

        if len(baseline_values) < 2 or len(current_values) < 2:
            feature_reports[col] = {"psi": 0.0, "ks": {}, "drift": False}
            continue

        psi = _compute_psi(baseline_values, current_values)
        ks = _compute_ks(baseline_values, current_values)
        drift = psi >= psi_threshold or ks.get("drift_detected", False)

        if drift:
            any_drift = True
            alerts.append(
                f"Feature '{col}': PSI={psi:.4f} (threshold={psi_threshold}), "
                f"KS p-value={ks['p_value']:.4f}"
            )

        feature_reports[col] = {
            "psi": round(psi, 6),
            "ks_statistic": round(ks["statistic"], 6),
            "ks_p_value": round(ks["p_value"], 6),
            "drift_detected": drift,
            "current_mean": round(float(np.mean(current_values)), 4),
            "baseline_mean": round(baseline[col].get("mean", 0), 4),
            "mean_shift": round(
                float(np.mean(current_values)) - baseline[col].get("mean", 0), 4
            ),
        }

    result = {
        "drift_detected": any_drift,
        "psi_threshold": psi_threshold,
        "ks_alpha": KS_ALPHA,
        "features": feature_reports,
        "alerts": alerts,
        "num_features_checked": len(feature_reports),
        "num_features_drifted": sum(
            1 for f in feature_reports.values() if f.get("drift_detected")
        ),
    }

    if any_drift:
        logger.warning("Data drift detected! %d features drifted.", result["num_features_drifted"])
    else:
        logger.info("No significant drift detected across %d features.", len(feature_reports))

    return result
