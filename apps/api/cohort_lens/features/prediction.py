"""Spending prediction with LinearRegression, RandomForest, AutoGluon, and cross-validation."""
from typing import Tuple, Dict, Optional, Any

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


def _try_autogluon(X: pd.DataFrame, y: pd.Series, time_limit: int = 30):
    """Use AutoGluon if available. Returns (model, metrics) or None.
    
    NOTE: AutoGluon is an EXPERIMENTAL feature and requires the autogluon package
    to be installed separately. It is not included in the default dependencies.
    When unavailable, the system falls back to linear_regression.
    """
    try:
        import autogluon.tabular as ag
    except ImportError:
        logger.info("AutoGluon not installed. Install with: pip install autogluon")
        return None
    train_data = X.copy()
    train_data["target"] = y.values
    predictor = ag.TabularPredictor(label="target", problem_type="regression").fit(
        train_data, time_limit=time_limit, presets="best_quality"
    )
    metrics = predictor.evaluate(train_data)
    mse = 0.0
    r2 = 0.0
    if isinstance(metrics, dict):
        rmse = metrics.get("root_mean_squared_error", 0) or metrics.get("RMSE", 0)
        mse = float(rmse) ** 2
        r2 = float(metrics.get("r2", 0) or metrics.get("R2", 0))
    return predictor, {"mse": mse, "mae": 0.0, "r2": r2}


def _try_lstm(X: pd.DataFrame, y: pd.Series) -> Optional[Tuple[object, Dict[str, float]]]:
    """
    LSTM/Transformer for time-series or sequence prediction.
    Returns (model, metrics) or None if not implemented or dependencies missing.

    NOTE: LSTM is currently EXPERIMENTAL and NOT FULLY IMPLEMENTED.
    This requires PyTorch and a proper sequence construction pipeline.
    The config option is reserved for future implementation.
    When selected, the system falls back to linear_regression.
    """
    try:
        import torch  # noqa: F401
    except ImportError:
        logger.info("PyTorch not installed. LSTM requires: pip install torch")
        return None
    # Not yet implemented: full LSTM requires sequence construction and training loop.
    logger.warning("LSTM algorithm is experimental and not yet implemented; falling back to linear_regression")
    return None


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

    if algo == "autogluon":
        result = _try_autogluon(X, y)
        if result:
            return result
        logger.warning("AutoGluon not available, falling back to linear_regression")
        algo = "linear_regression"

    if algo == "lstm":
        result = _try_lstm(X, y)
        if result:
            return result
        logger.warning("LSTM not available, falling back to linear_regression")
        algo = "linear_regression"

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


def explain_prediction(
    model: object,
    X: pd.DataFrame,
    sample_index: int = 0,
) -> Dict[str, Any]:
    """Compute SHAP feature importance for a prediction. Works with sklearn Pipeline."""
    try:
        import shap
    except ImportError:
        return {"error": "SHAP not installed", "feature_importance": {}}

    sample = X.iloc[[sample_index]]
    try:
        explainer = shap.Explainer(model.predict, X)
        shap_values = explainer(sample)
    except Exception as e:
        return {"error": str(e), "feature_importance": {}}

    vals = shap_values.values
    if hasattr(vals, "shape") and len(vals.shape) > 1:
        vals = vals[0]
    names = list(X.columns)
    importance = dict(zip(names, [float(v) for v in vals]))
    return {"feature_importance": importance, "sample_index": sample_index}
