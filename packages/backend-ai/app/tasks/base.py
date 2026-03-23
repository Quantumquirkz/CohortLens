"""Base Celery tasks with retries and error logging."""

from __future__ import annotations

import logging
from typing import Any

from celery import Task

logger = logging.getLogger(__name__)


class BaseRetryTask(Task):
    """Exponential backoff for transient failures (network, broker, I/O)."""

    abstract = True
    autoretry_for = (ConnectionError, OSError, TimeoutError)
    retry_kwargs = {"max_retries": 5}
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True

    def on_failure(
        self,
        exc: Exception,
        task_id: str,
        args: tuple[Any, ...],
        kwargs: dict[str, Any],
        einfo: Any,
    ) -> None:
        logger.exception(
            "Celery task failed task_id=%s name=%s: %s",
            task_id,
            self.name,
            exc,
        )


class OracleScanTask(BaseRetryTask):
    """On-chain scan: fewer retries to avoid duplicate fulfill."""

    autoretry_for = (ConnectionError, OSError, TimeoutError)
    retry_kwargs = {"max_retries": 3}
    retry_backoff = True
    retry_backoff_max = 120
