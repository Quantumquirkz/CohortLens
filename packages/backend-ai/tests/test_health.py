"""Smoke tests for public HTTP endpoints."""

from __future__ import annotations

from app.main import app
from fastapi.testclient import TestClient


def test_health_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
