"""Tests for data drift detection."""
import json
import pytest
import numpy as np
import pandas as pd
from pathlib import Path

from cohort_lens.data.drift import (
    _compute_psi,
    _compute_ks,
    check_drift,
    save_baseline,
)


class TestPSI:
    def test_identical_distributions_low_psi(self):
        """PSI should be near 0 for identical distributions."""
        np.random.seed(42)
        data = np.random.normal(50, 10, 1000)
        psi = _compute_psi(data, data)
        assert psi < 0.01

    def test_different_distributions_high_psi(self):
        """PSI should be high for significantly different distributions."""
        np.random.seed(42)
        baseline = np.random.normal(50, 10, 1000)
        shifted = np.random.normal(80, 10, 1000)  # Large shift
        psi = _compute_psi(baseline, shifted)
        assert psi > 0.2

    def test_moderate_shift(self):
        """PSI should be moderate for a slight distribution shift."""
        np.random.seed(42)
        baseline = np.random.normal(50, 10, 1000)
        shifted = np.random.normal(55, 10, 1000)  # Slight shift
        psi = _compute_psi(baseline, shifted)
        assert 0 < psi < 1.0  # Should be noticeable but not extreme


class TestKS:
    def test_identical_distributions(self):
        """KS test for identical distributions should not detect drift."""
        np.random.seed(42)
        data = np.random.normal(50, 10, 500)
        result = _compute_ks(data, data)
        assert result["statistic"] == 0.0 or result["p_value"] > 0.05
        assert result["drift_detected"] == False

    def test_different_distributions(self):
        """KS test should detect drift for significantly different distributions."""
        np.random.seed(42)
        baseline = np.random.normal(50, 10, 500)
        shifted = np.random.normal(70, 10, 500)
        result = _compute_ks(baseline, shifted)
        assert result["p_value"] < 0.05
        assert result["drift_detected"] == True


class TestCheckDrift:
    def test_no_baseline_returns_stats(self):
        """When no baseline exists, should return current stats without drift."""
        df = pd.DataFrame({
            "Age": [25, 30, 35, 40, 45],
            "Annual Income ($)": [40000, 50000, 60000, 70000, 80000],
            "Spending Score (1-100)": [30, 50, 60, 70, 80],
        })
        result = check_drift(df, baseline_path=Path("/nonexistent/path.json"))
        assert result["drift_detected"] is False
        assert "feature_stats" in result

    def test_with_baseline_no_drift(self, tmp_path):
        """When baseline matches current data, no drift should be detected."""
        np.random.seed(42)
        df = pd.DataFrame({
            "Age": np.random.normal(35, 10, 100),
            "Annual Income ($)": np.random.normal(60000, 15000, 100),
        })
        baseline_path = tmp_path / "baseline.json"
        save_baseline(df, baseline_path)

        result = check_drift(df, baseline_path=baseline_path)
        assert result["drift_detected"] is False
        assert result["num_features_checked"] >= 2

    def test_with_baseline_drift_detected(self, tmp_path):
        """When distributions shift significantly, drift should be detected."""
        np.random.seed(42)
        baseline_df = pd.DataFrame({
            "Age": np.random.normal(35, 10, 500),
            "Annual Income ($)": np.random.normal(60000, 15000, 500),
        })
        baseline_path = tmp_path / "baseline.json"
        save_baseline(baseline_df, baseline_path)

        # Significantly shifted data
        shifted_df = pd.DataFrame({
            "Age": np.random.normal(55, 10, 500),  # Shifted by 20
            "Annual Income ($)": np.random.normal(90000, 15000, 500),  # Shifted
        })

        result = check_drift(shifted_df, baseline_path=baseline_path)
        assert result["drift_detected"] is True
        assert result["num_features_drifted"] >= 1
        assert len(result["alerts"]) > 0


class TestSaveBaseline:
    def test_save_and_load(self, tmp_path):
        """Saving and loading baseline should preserve feature stats."""
        df = pd.DataFrame({
            "Age": [25, 30, 35],
            "Income": [40000.0, 50000.0, 60000.0],
        })
        baseline_path = tmp_path / "baseline.json"
        save_baseline(df, baseline_path)

        assert baseline_path.exists()
        data = json.loads(baseline_path.read_text())
        assert "Age" in data
        assert "Income" in data
        assert "mean" in data["Age"]
        assert "values" in data["Age"]
        assert len(data["Age"]["values"]) == 3
