"""Model registry and artifact loading from IPFS (local cache)."""

from __future__ import annotations

import asyncio
import io
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from onnxruntime import InferenceSession
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import LensRecord
from app.services.ipfs_client import cat_bytes


class ModelRegistryError(RuntimeError):
    """Failed to load or run a model."""


class ModelRegistry:
    """Local paths and pickle/ONNX prediction."""

    def __init__(self, db: Session, cache_dir: Path | None = None) -> None:
        self._db = db
        self._cache = cache_dir or settings.MODEL_CACHE_DIR
        self._cache.mkdir(parents=True, exist_ok=True)

    def get_lens_row(self, lens_id: int) -> LensRecord:
        row = self._db.get(LensRecord, lens_id)
        if row is None:
            msg = f"Lens {lens_id} not found in database"
            raise ModelRegistryError(msg)
        if not row.active:
            msg = f"Lens {lens_id} is inactive"
            raise ModelRegistryError(msg)
        return row

    def local_path_for(self, row: LensRecord) -> Path:
        safe = row.cid.replace("/", "_")
        return self._cache / f"{row.id}_{safe}.bin"

    def ensure_downloaded(self, row: LensRecord) -> Path:
        path = self.local_path_for(row)
        if path.exists() and path.stat().st_size > 0:
            return path
        data = asyncio.run(cat_bytes(row.cid))
        path.write_bytes(data)
        return path

    def predict(self, row: LensRecord, features: list[float]) -> dict[str, Any]:
        path = self.ensure_downloaded(row)
        fmt = row.model_format.lower()
        if fmt == "pickle":
            return self._predict_pickle(path, features)
        if fmt == "onnx":
            return self._predict_onnx(path, features)
        msg = f"Unsupported format: {row.model_format}"
        raise ModelRegistryError(msg)

    def infer_feature_count(self, row: LensRecord) -> int | None:
        """Best effort model input size inference, used for frontend hints."""
        if row.model_format.lower() != "onnx":
            return None
        path = self.ensure_downloaded(row)
        try:
            sess = InferenceSession(str(path))
            inp = sess.get_inputs()
            if not inp:
                return None
            shape = inp[0].shape
            if len(shape) != 2:
                return None
            dim = shape[1]
            if dim in (None, -1):
                return None
            return int(dim)
        except Exception:
            return None

    def _predict_pickle(self, path: Path, features: list[float]) -> dict[str, Any]:
        try:
            model = joblib.load(path)
        except Exception as e:
            raise ModelRegistryError(f"Could not load pickle: {e}") from e
        if not hasattr(model, "predict"):
            raise ModelRegistryError("Pickle object does not expose predict()")
        x = np.array(features, dtype=np.float64).reshape(1, -1)
        try:
            out = model.predict(x)
        except Exception as e:
            raise ModelRegistryError(f"predict() failed: {e}") from e
        return {
            "raw": out.tolist() if hasattr(out, "tolist") else list(out),
            "format": "pickle",
        }

    def _predict_onnx(self, path: Path, features: list[float]) -> dict[str, Any]:
        try:
            sess = InferenceSession(str(path))
        except Exception as e:
            raise ModelRegistryError(f"Invalid ONNX: {e}") from e
        inp = sess.get_inputs()
        if not inp:
            raise ModelRegistryError("ONNX session has no inputs")
        name = inp[0].name
        shape = inp[0].shape
        arr = np.array(features, dtype=np.float32).reshape(1, -1)
        if len(shape) == 2 and shape[1] not in (None, -1) and int(shape[1]) != arr.shape[1]:
            msg = f"Expected {shape[1]} features, got {arr.shape[1]}"
            raise ModelRegistryError(msg)
        try:
            out = sess.run(None, {name: arr})
        except Exception as e:
            raise ModelRegistryError(f"ONNX inference failed: {e}") from e
        first = out[0] if out else None
        return {
            "raw": first.tolist() if first is not None else [],
            "format": "onnx",
        }


def validate_pickle_buffer(buf: bytes, max_bytes: int) -> None:
    """Ephemeral in-memory load to validate predict(); does not persist."""
    if len(buf) > max_bytes:
        msg = f"File too large (max {max_bytes} bytes)"
        raise ModelRegistryError(msg)
    try:
        model = joblib.load(io.BytesIO(buf))
    except Exception as e:
        raise ModelRegistryError(f"Invalid pickle/joblib: {e}") from e
    if not hasattr(model, "predict"):
        raise ModelRegistryError("Model must have a predict method")


def validate_onnx_buffer(buf: bytes, max_bytes: int) -> None:
    if len(buf) > max_bytes:
        msg = f"File too large (max {max_bytes} bytes)"
        raise ModelRegistryError(msg)
    tmp = settings.MODEL_CACHE_DIR / "_validate.onnx"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_bytes(buf)
    try:
        InferenceSession(str(tmp))
    except Exception as e:
        raise ModelRegistryError(f"Invalid ONNX: {e}") from e
    finally:
        tmp.unlink(missing_ok=True)
