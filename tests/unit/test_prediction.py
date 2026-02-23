"""Tests for prediction."""
import pytest

from cohort_lens.data.loader import load_customers
from cohort_lens.data.preprocessor import clean_customers, encode_for_prediction
from cohort_lens.features.prediction import train_predictor

from .test_loader import FIXTURE_PATH


def test_train_predictor():
    df = load_customers(FIXTURE_PATH)
    df = clean_customers(df)
    X, y, _ = encode_for_prediction(df)
    model, metrics = train_predictor(X, y)
    assert "mse" in metrics
    assert "r2" in metrics
    assert metrics["mse"] >= 0
    import math
    r2 = metrics["r2"]
    assert math.isnan(r2) or (-10 <= r2 <= 10)
