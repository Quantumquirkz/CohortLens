"""Data cleaning and encoding for prediction."""

from typing import Tuple

import pandas as pd
from sklearn.preprocessing import OneHotEncoder

from cohort_lens.utils.config_reader import get_config
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def clean_customers(df: pd.DataFrame) -> pd.DataFrame:
    """Clean customer data: drop nulls, duplicates, fix dtypes."""
    n_before = len(df)
    df = df.dropna()
    df = df.drop_duplicates()
    n_after = len(df)
    if n_before != n_after:
        logger.info("Removed %d rows (nulls/duplicates)", n_before - n_after)
    return df.reset_index(drop=True)


def encode_for_prediction(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.Series, OneHotEncoder | None]:
    """Encode categorical features for prediction. Returns (X, y, encoder)."""
    cfg = get_config()
    pred_cfg = cfg.get("models", {}).get("prediction", {})
    feat_cfg = pred_cfg.get("features", {})
    numerical = feat_cfg.get("numerical", ["Annual Income ($)", "Age", "Work Experience", "Family Size"])
    categorical = feat_cfg.get("categorical", ["Profession"])
    target = pred_cfg.get("target", "Spending Score (1-100)")
    drop_first = pred_cfg.get("drop_first", True)

    X_num = df[numerical].copy()
    y = df[target]

    encoder = None
    if categorical:
        X_cat = df[categorical]
        encoder = OneHotEncoder(drop="first" if drop_first else None, sparse_output=False)
        cat_encoded = encoder.fit_transform(X_cat)
        cat_cols = encoder.get_feature_names_out(categorical)
        X_cat_df = pd.DataFrame(cat_encoded, columns=cat_cols, index=df.index)
        X = pd.concat([X_num, X_cat_df], axis=1)
    else:
        X = X_num

    return X, y, encoder
