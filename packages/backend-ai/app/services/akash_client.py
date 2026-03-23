"""Optional client for Akash deployments (manual scaling via CLI is recommended)."""

from __future__ import annotations

import logging
import subprocess
from subprocess import CalledProcessError
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class AkashClientError(RuntimeError):
    """Failed to invoke the Akash CLI."""


def list_deployments() -> list[dict[str, Any]]:
    """List deployments via ``akash query`` (requires CLI on PATH)."""
    if not settings.AKASH_CLI_ENABLED:
        return []
    try:
        out = subprocess.run(
            ["akash", "query", "deployment", "list", "--output", "json"],
            check=True,
            capture_output=True,
            text=True,
            timeout=30.0,
        )
    except (FileNotFoundError, CalledProcessError, subprocess.TimeoutExpired) as e:
        raise AkashClientError(str(e)) from e
    import json

    try:
        data = json.loads(out.stdout or "{}")
    except json.JSONDecodeError as e:
        raise AkashClientError("Invalid JSON response") from e
    return data.get("deployments", []) if isinstance(data, dict) else []


def suggest_scale_for_queue_depth(_pending_tasks: int) -> str:
    """Documentation: scaling on Akash is usually done by adding replicas or leases."""
    return (
        "Increase `count` in the deployment or add more leases; see "
        "`deploy/akash/README.md` and the Akash CLI."
    )
