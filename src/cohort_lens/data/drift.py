"""Data drift monitoring (stub for future implementation)."""
from pathlib import Path
from typing import Optional

import pandas as pd


def check_drift(current_df: pd.DataFrame, baseline_path: Optional[Path] = None) -> dict:
    """Check for data drift against baseline. Returns summary stats for future comparison.

    Stub: logs feature stats at 'training' time; full drift detection to be implemented.
    """
    numeric = current_df.select_dtypes(include=["number"])
    stats = {col: {"mean": float(numeric[col].mean()), "std": float(numeric[col].std())} for col in numeric.columns}
    return {"feature_stats": stats, "drift_detected": False}
