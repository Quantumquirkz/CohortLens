"""Tests for audit log module (unit tests without Neon DB dependency)."""
import pytest
from unittest.mock import patch, MagicMock


class TestWriteAuditLog:
    @patch("cohort_lens.data.audit.get_engine")
    @patch("cohort_lens.data.audit.create_schema")
    def test_write_audit_log_success(self, mock_schema, mock_engine):
        """write_audit_log should execute INSERT and return True."""
        mock_conn = MagicMock()
        mock_engine.return_value.connect.return_value.__enter__ = lambda s: mock_conn
        mock_engine.return_value.connect.return_value.__exit__ = MagicMock(return_value=False)

        from cohort_lens.data.audit import write_audit_log

        result = write_audit_log(
            table_name="customers",
            record_id="123",
            action="INSERT",
            new_values={"name": "test"},
            user_id="admin",
        )
        assert result is True
        mock_conn.execute.assert_called_once()
        mock_conn.commit.assert_called_once()

    @patch("cohort_lens.data.audit.get_engine", side_effect=Exception("DB unavailable"))
    def test_write_audit_log_failure(self, mock_engine):
        """write_audit_log should return False on failure."""
        from cohort_lens.data.audit import write_audit_log

        result = write_audit_log(
            table_name="customers",
            record_id="123",
            action="INSERT",
        )
        assert result is False


class TestGetAuditLog:
    @patch("cohort_lens.data.audit.get_engine")
    @patch("cohort_lens.data.audit.create_schema")
    def test_get_audit_log_empty(self, mock_schema, mock_engine):
        """get_audit_log should return empty list when no entries."""
        mock_conn = MagicMock()
        mock_conn.execute.return_value.fetchall.return_value = []
        mock_engine.return_value.connect.return_value.__enter__ = lambda s: mock_conn
        mock_engine.return_value.connect.return_value.__exit__ = MagicMock(return_value=False)

        from cohort_lens.data.audit import get_audit_log

        result = get_audit_log()
        assert result == []

    @patch("cohort_lens.data.audit.get_engine", side_effect=Exception("DB unavailable"))
    def test_get_audit_log_failure(self, mock_engine):
        """get_audit_log should return empty list on DB failure."""
        from cohort_lens.data.audit import get_audit_log

        result = get_audit_log()
        assert result == []


class TestPersistence:
    def test_model_version(self):
        """set/get model version should work."""
        from cohort_lens.data.persistence import set_model_version, get_model_version

        set_model_version("v2.0.0")
        assert get_model_version() == "v2.0.0"
        set_model_version("v1.0.0")  # Reset

    def test_persist_segments_missing_columns(self):
        """persist_segments should return 0 when required columns are missing."""
        import pandas as pd
        from cohort_lens.data.persistence import persist_segments

        df = pd.DataFrame({"Age": [25, 30]})
        result = persist_segments(df)
        assert result == 0

    @patch("cohort_lens.data.persistence.get_engine", side_effect=Exception("DB unavailable"))
    @patch("cohort_lens.data.persistence.create_schema")
    def test_persist_prediction_failure(self, mock_schema, mock_engine):
        """persist_prediction should return False on DB failure."""
        from cohort_lens.data.persistence import persist_prediction

        result = persist_prediction(
            customer_id="123",
            predicted_spending=65.0,
        )
        assert result is False
