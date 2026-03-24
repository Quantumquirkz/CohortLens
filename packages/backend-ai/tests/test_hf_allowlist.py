"""Hugging Face allowlist and repo id validation."""

from __future__ import annotations

import pytest
from app.core.config import Settings
from app.services.huggingface_sync import (
    HuggingFaceSyncError,
    is_repo_allowed,
    validate_repo_id,
)


def test_validate_repo_id_ok() -> None:
    assert validate_repo_id("org/model") == "org/model"


def test_validate_repo_id_rejects_invalid() -> None:
    with pytest.raises(HuggingFaceSyncError):
        validate_repo_id("not-a-repo")


def test_is_repo_allowed_star(monkeypatch: pytest.MonkeyPatch) -> None:
    s = Settings(HF_ALLOWED_REPOS="*")
    monkeypatch.setattr("app.services.huggingface_sync.settings", s)
    assert is_repo_allowed("any/corp") is True


def test_is_repo_allowed_explicit(monkeypatch: pytest.MonkeyPatch) -> None:
    s = Settings(HF_ALLOWED_REPOS="foo/bar, baz/qux")
    monkeypatch.setattr("app.services.huggingface_sync.settings", s)
    assert is_repo_allowed("foo/bar") is True
    assert is_repo_allowed("baz/qux") is True
    assert is_repo_allowed("other/model") is False
