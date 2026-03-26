"""Smoke tests for the GraphQL read endpoint."""

from __future__ import annotations

from app.main import app
from fastapi.testclient import TestClient


def test_graphql_home_status() -> None:
    payload = {"query": "query { homeStatus { apiStatus modelsCount chainCount defaultChain } }"}
    with TestClient(app) as client:
        response = client.post("/graphql", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "errors" not in body
    assert body["data"]["homeStatus"]["apiStatus"] == "ok"


def test_graphql_models_query_ok() -> None:
    payload = {"query": "query { models { items { id } } }"}
    with TestClient(app) as client:
        response = client.post("/graphql", json=payload)
    assert response.status_code == 200
    assert "errors" not in response.json()

