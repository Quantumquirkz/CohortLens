"""Hugging Face Hub: allowlist checks and snapshot download into MODEL_CACHE_DIR."""

from __future__ import annotations

import re
from pathlib import Path

from huggingface_hub import snapshot_download
from huggingface_hub.errors import HfHubHTTPError

from app.core.config import settings

_REPO_RE = re.compile(r"^[\w.-]+/[\w.-]+$")


class HuggingFaceSyncError(RuntimeError):
    """Invalid repo or Hub error."""


def validate_repo_id(repo_id: str) -> str:
    rid = repo_id.strip()
    if not _REPO_RE.match(rid):
        msg = "hf_repo_id must look like org-or-user/model-name"
        raise HuggingFaceSyncError(msg)
    return rid


def is_repo_allowed(repo_id: str) -> bool:
    """Return True if sync/link is permitted for this repo id."""
    rid = repo_id.strip().lower()
    allowed = settings.hf_allowed_repos_list()
    if not allowed:
        return False
    if any(a == "*" for a in allowed):
        return True
    return rid in {a.strip().lower() for a in allowed}


def download_snapshot(repo_id: str, dest_root: Path | None = None) -> Path:
    """Download a snapshot of the repo into dest_root/hf_snapshots/{safe_repo}."""
    rid = validate_repo_id(repo_id)
    if not is_repo_allowed(rid):
        raise HuggingFaceSyncError("Repository is not in HF_ALLOWED_REPOS")
    root = dest_root or settings.MODEL_CACHE_DIR
    safe = rid.replace("/", "__")
    target = root / "hf_snapshots" / safe
    target.mkdir(parents=True, exist_ok=True)
    token = settings.HF_TOKEN.strip() or None
    try:
        path_str = snapshot_download(
            rid,
            local_dir=str(target),
            local_dir_use_symlinks=False,
            token=token,
        )
    except HfHubHTTPError as e:
        raise HuggingFaceSyncError(str(e)) from e
    return Path(path_str)
