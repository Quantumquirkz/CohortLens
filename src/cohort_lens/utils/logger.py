"""Structured logging for CohortLens."""
import logging
import sys


def get_logger(name, level=None):
    try:
        from cohort_lens.utils.config_reader import get_config
        cfg = get_config()
    except Exception:
        cfg = {}
    log_cfg = cfg.get("logging", {})
    log_level = level or log_cfg.get("level", "INFO")
    log_format = log_cfg.get("format", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(handler)
    return logger
