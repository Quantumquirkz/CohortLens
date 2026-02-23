"""Tests for preprocessor."""
import pandas as pd
from cohort_lens.data.loader import load_customers
from cohort_lens.data.preprocessor import clean_customers, encode_for_prediction
from .test_loader import FIXTURE_PATH

def test_clean_customers():
    df = load_customers(FIXTURE_PATH)
    cleaned = clean_customers(df)
    assert cleaned.isnull().sum().sum() == 0
    assert cleaned.duplicated().sum() == 0

def test_encode_for_prediction():
    df = load_customers(FIXTURE_PATH)
    df = clean_customers(df)
    X, y, encoder = encode_for_prediction(df)
    assert len(X) == len(y)
