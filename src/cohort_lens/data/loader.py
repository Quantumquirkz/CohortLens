"""Data loader with validation and optional caching."""

from pathlib import Path
from typing import Optional

import pandas as pd

from cohort_lens.data.schemas import customer_schema
from cohort_lens.utils.config_reader import get_config, get_project_root
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)

_cached_df: Optional[pd.DataFrame] = None
_cached_path: Optional[str] = None


def load_customers(path: Optional[str | Path] = None, validate: bool = True) -> pd.DataFrame:
    """Load customer CSV with optional validation and caching."""
    global _cached_df, _cached_path

    cfg = get_config()
    root = get_project_root()
    data_cfg = cfg.get("data", {})

    if path is None:
        raw_path = data_cfg.get("raw_path", "data/raw")
        filename = data_cfg.get("raw_filename", "Customers.csv")
        path = root / raw_path / filename

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}. Place Customers.csv in data/raw/")

    if _cached_df is not None and str(path) == _cached_path:
        logger.info("Returning cached customer data")
        return _cached_df.copy()

    logger.info("Loading customer data from %s", path)
    df = pd.read_csv(path)
    if "Annual Income ($)" in df.columns:
        df["Annual Income ($)"] = pd.to_numeric(df["Annual Income ($)"], errors="coerce").astype(float)

    if validate:
        customer_schema.validate(df)
        logger.info("Schema validation passed")

    logger.info("Loaded %d rows", len(df))
    _cached_df = df.copy()
    _cached_path = str(path)
    return df
