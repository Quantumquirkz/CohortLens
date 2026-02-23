"""Statistical analysis for CRM insights."""
import pandas as pd

from cohort_lens.utils.config_reader import get_config


def compute_descriptive_stats(df: pd.DataFrame) -> pd.DataFrame:
    cfg = get_config()
    num_cols = cfg.get("features", {}).get("numerical", [])
    available = [c for c in num_cols if c in df.columns]
    if not available:
        available = df.select_dtypes(include=["number"]).columns.tolist()
    return df[available].describe()


def compute_correlation_matrix(df: pd.DataFrame) -> pd.DataFrame:
    numeric = df.select_dtypes(include=["number"])
    return numeric.corr()
