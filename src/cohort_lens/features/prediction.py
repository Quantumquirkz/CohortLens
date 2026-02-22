"""Spending prediction with LinearRegression, RandomForest, and cross-validation."""
from typing import Tuple, Dict, Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_validate

from cohort_lens.utils.config_reader import get_config
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def train_predictor(
    X: pd.DataFrame,
    y: pd.Series,
    algorithm: Optional[str] = None,
    cv_folds: Optional[int] = None,
    random_state: Optional[int] = None,
) -> Tuple[object, Dict[str, float]]:
    cfg = get_config()
    pred_cfg = cfg.get("models", {}).get("prediction", {})
    algo = algorithm or pred_cfg.get("algorithm", "linear_regression")
    cv = cv_folds if cv_folds is not None else pred_cfg.get("cv_folds", 5)
    seed = random_state if random_state is not None else cfg.get("models", {}).get("random_seed", 42)

    if algo == "linear_regression":
        base = LinearRegression()
    elif algo == "random_forest":
        base = RandomForestRegressor(random_state=seed, n_estimators=100)
    else:
        base = LinearRegression()
    model = Pipeline([("scaler", StandardScaler()), ("model", base)])

    scores = cross_validate(
        model, X, y, cv=cv,
        scoring=("neg_mean_squared_error", "neg_mean_absolute_error", "r2"),
        return_train_score=False,
    )

    model.fit(X, y)
    metrics = {
        "mse": float(np.mean(-scores["test_neg_mean_squared_error"])),
        "mae": float(np.mean(-scores["test_neg_mean_absolute_error"])),
        "r2": float(np.mean(scores["test_r2"])),
    }
    logger.info("Prediction: %s, MSE=%.2f, R2=%.3f", algo, metrics["mse"], metrics["r2"])
    return model, metrics
