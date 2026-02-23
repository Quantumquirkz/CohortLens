"""Configuration loader for CohortLens."""
import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

_CONFIG = None
_PROJECT_ROOT = None


def _find_project_root():
    """Find monorepo root (directory containing config/config.yaml)."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "config" / "config.yaml").exists():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    return Path.cwd()


def load_config(config_path=None):
    global _CONFIG, _PROJECT_ROOT
    load_dotenv()
    _PROJECT_ROOT = _find_project_root()
    cfg_path = Path(config_path) if config_path else _PROJECT_ROOT / "config" / "config.yaml"
    if not cfg_path.exists():
        raise FileNotFoundError(f"Config not found: {cfg_path}")
    with open(cfg_path, encoding="utf-8") as f:
        _CONFIG = yaml.safe_load(f) or {}
    if raw := os.getenv("DATA_RAW_PATH"):
        _CONFIG.setdefault("data", {})["raw_path"] = raw
    if proc := os.getenv("DATA_PROCESSED_PATH"):
        _CONFIG.setdefault("data", {})["processed_path"] = proc
    return _CONFIG


def get_config():
    global _CONFIG
    if _CONFIG is None:
        load_config()
    return _CONFIG or {}


def get_project_root():
    global _PROJECT_ROOT
    if _PROJECT_ROOT is None:
        _PROJECT_ROOT = _find_project_root()
    return _PROJECT_ROOT
