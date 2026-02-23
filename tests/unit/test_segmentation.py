"""Tests for segmentation."""
import pytest
import pandas as pd

from cohort_lens.data.loader import load_customers
from cohort_lens.data.preprocessor import clean_customers
from cohort_lens.features.segmentation import fit_segments, interpret_segments

from .test_loader import FIXTURE_PATH


def test_fit_segments():
    df = load_customers(FIXTURE_PATH)
    df = clean_customers(df)
    df_seg, model, scaler = fit_segments(df, n_clusters=3)
    assert "Cluster" in df_seg.columns
    assert len(df_seg) == len(df)
    assert df_seg["Cluster"].nunique() <= 3


def test_interpret_segments():
    df = load_customers(FIXTURE_PATH)
    df = clean_customers(df)
    df_seg, _, _ = fit_segments(df, n_clusters=2)
    profiles = interpret_segments(df_seg)
    assert isinstance(profiles, dict)
    for k, v in profiles.items():
        assert "count" in v
        assert "mean_age" in v
        assert "mean_income" in v
