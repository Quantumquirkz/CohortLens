"""Tests for FastAPI REST API endpoints."""
import os
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Set test environment before any imports
os.environ["DATA_SOURCE"] = "csv"
os.environ["JWT_SECRET"] = "test-secret-key"
os.environ["DEFAULT_AUTH_USER"] = "admin"
os.environ["DEFAULT_USER_PASSWORD"] = "admin"
os.environ["NEON_DATABASE_URL"] = "postgresql://u:p@h/d"


@pytest.fixture(scope="module")
def client():
    """Create FastAPI test client with mocked database and services."""
    df = pd.DataFrame({
        "CustomerID": ["1", "2"],
        "Age": [25, 30],
        "Annual Income ($)": [50000.0, 60000.0],
        "Spending Score (1-100)": [50, 60],
        "Work Experience": [5, 6],
        "Family Size": [2, 3],
        "Profession": ["Artist", "Engineer"],
        "Gender": ["Male", "Female"]
    })

    # High-level patches to catch all ways load_customers might have been imported
    with patch("cohort_lens.data.load_customers", return_value=df), \
         patch("cohort_lens.data.loader.load_customers", return_value=df), \
         patch("cohort_lens.data.clean_customers", side_effect=lambda x: x), \
         patch("cohort_lens.data.preprocessor.clean_customers", side_effect=lambda x: x), \
         patch("cohort_lens.data.encode_for_prediction", return_value=(pd.DataFrame([[1]]), pd.Series([1]), ["f1"])), \
         patch("cohort_lens.data.db.get_engine"), \
         patch("cohort_lens.data.db.create_schema"), \
         patch("cohort_lens.data.audit.write_audit_log"), \
         patch("cohort_lens.data.persistence.persist_prediction"), \
         patch("cohort_lens.data.persistence.persist_segments"), \
         patch("cohort_lens.data.drift.check_drift", return_value={"drift_detected": False}), \
         patch("cohort_lens.data.drift.save_baseline"), \
         patch("cohort_lens.features.fit_segments", return_value=(df, MagicMock(), MagicMock())), \
         patch("cohort_lens.features.train_predictor", return_value=(MagicMock(), {"mse": 0.1, "r2": 0.9})):
        
        # We also need to patch rest_api specifically because it imports these before we can patch the source 
        # (if rest_api was already imported elsewhere, which it shouldn't be but let's be safe)
        with patch("cohort_lens.api.rest_api.load_customers", return_value=df), \
             patch("cohort_lens.api.rest_api.clean_customers", side_effect=lambda x: x), \
             patch("cohort_lens.api.rest_api.fit_segments", return_value=(df, MagicMock(), MagicMock())), \
             patch("cohort_lens.api.rest_api.train_predictor", return_value=(MagicMock(), {"mse": 0.1, "r2": 0.9})):
            
            from cohort_lens.api.rest_api import app
            import cohort_lens.api.rest_api as rest_api
            
            # Reset lazy-loaded models to trigger mocked _load_models logic
            rest_api._predictor = None
            rest_api._segmentation_model = None
            rest_api._scaler = None
            
            return TestClient(app)


@pytest.fixture(scope="module")
def auth_token(client):
    """Get a valid auth token for testing."""
    response = client.post(
        "/api/v1/token",
        data={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for protected endpoints."""
    return {"Authorization": f"Bearer {auth_token}"}


# ---- Health ----

class TestHealth:
    def test_health_returns_ok(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("ok", "degraded")
        assert data["service"] == "cohortlens"


# ---- Auth ----

class TestAuth:
    def test_login_success(self, client):
        response = client.post(
            "/api/v1/token",
            data={"username": "admin", "password": "admin"},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()


# ---- Prediction ----

class TestPrediction:
    def test_predict_spending_success(self, client, auth_headers):
        response = client.post(
            "/api/v1/predict-spending",
            json={
                "age": 35,
                "annual_income": 75000.0,
                "work_experience": 10,
                "family_size": 3,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "predicted_spending" in response.json()


# ---- Segmentation ----

class TestSegmentation:
    def test_segment_batch_success(self, client, auth_headers):
        customers = [
            {"Age": 25, "Annual Income ($)": 30000, "Spending Score (1-100)": 50},
        ]
        response = client.post(
            "/api/v1/segment",
            json=customers,
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "clusters" in response.json()


# ---- Drift ----

class TestDrift:
    def test_drift_check_success(self, client, auth_headers):
        response = client.get("/api/v1/drift", headers=auth_headers)
        assert response.status_code == 200

    def test_save_baseline_success(self, client, auth_headers):
        response = client.post("/api/v1/drift/save-baseline", headers=auth_headers)
        assert response.status_code == 200


# ---- Reports ----

class TestReports:
    def test_generate_report(self, client, auth_headers):
        with patch("cohort_lens.api.rest_api.generate_executive_report", return_value="reports/test.html"):
            response = client.post(
                "/api/v1/reports/generate",
                json={"metrics": ["mse"], "format": "html"},
                headers=auth_headers,
            )
            assert response.status_code == 200


# ---- Usage ----

class TestUsage:
    def test_get_usage(self, client, auth_headers):
        with patch("cohort_lens.api.rest_api.get_usage_persistent", return_value=10):
            response = client.get("/api/v1/usage", headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["current_month_calls"] == 10


# ---- Consent ----

class TestConsent:
    def test_consent_register(self, client):
        with patch("cohort_lens.api.rest_api.register_consent", return_value=True):
            response = client.post(
                "/api/v1/consent/register",
                json={"customer_id": "1", "consent_type": "data_share", "granted": True},
            )
            assert response.status_code == 200


# ---- GraphQL ----

class TestGraphQL:
    def test_graphql_health(self, client):
        response = client.post(
            "/graphql",
            json={"query": "{ health }"},
        )
        assert response.status_code == 200
        assert response.json()["data"]["health"] == "ok"
