"""Registro y carga de artefactos ML desde IPFS (caché local)."""

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
    """Error al cargar o ejecutar un modelo."""


class ModelRegistry:
    """Gestiona rutas locales y predicción pickle/ONNX."""

    def __init__(self, db: Session, cache_dir: Path | None = None) -> None:
        self._db = db
        self._cache = cache_dir or settings.MODEL_CACHE_DIR
        self._cache.mkdir(parents=True, exist_ok=True)

    def get_lens_row(self, lens_id: int) -> LensRecord:
        row = self._db.get(LensRecord, lens_id)
        if row is None:
            msg = f"Lente {lens_id} no encontrada en la base de datos"
            raise ModelRegistryError(msg)
        if not row.active:
            msg = f"Lente {lens_id} inactiva"
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
        msg = f"Formato no soportado: {row.model_format}"
        raise ModelRegistryError(msg)

    def _predict_pickle(self, path: Path, features: list[float]) -> dict[str, Any]:
        try:
            model = joblib.load(path)
        except Exception as e:
            raise ModelRegistryError(f"No se pudo cargar pickle: {e}") from e
        if not hasattr(model, "predict"):
            raise ModelRegistryError("El objeto pickle no expone predict()")
        x = np.array(features, dtype=np.float64).reshape(1, -1)
        try:
            out = model.predict(x)
        except Exception as e:
            raise ModelRegistryError(f"predict() falló: {e}") from e
        return {
            "raw": out.tolist() if hasattr(out, "tolist") else list(out),
            "format": "pickle",
        }

    def _predict_onnx(self, path: Path, features: list[float]) -> dict[str, Any]:
        try:
            sess = InferenceSession(str(path))
        except Exception as e:
            raise ModelRegistryError(f"ONNX inválido: {e}") from e
        inp = sess.get_inputs()
        if not inp:
            raise ModelRegistryError("Sesión ONNX sin entradas")
        name = inp[0].name
        shape = inp[0].shape
        arr = np.array(features, dtype=np.float32).reshape(1, -1)
        if len(shape) == 2 and shape[1] not in (None, -1) and int(shape[1]) != arr.shape[1]:
            msg = f"Se esperaban {shape[1]} features, hay {arr.shape[1]}"
            raise ModelRegistryError(msg)
        try:
            out = sess.run(None, {name: arr})
        except Exception as e:
            raise ModelRegistryError(f"Inferencia ONNX falló: {e}") from e
        first = out[0] if out else None
        return {
            "raw": first.tolist() if first is not None else [],
            "format": "onnx",
        }


def validate_pickle_buffer(buf: bytes, max_bytes: int) -> None:
    """Carga efímera en memoria para comprobar predict; no persiste."""
    if len(buf) > max_bytes:
        msg = f"Archivo demasiado grande (máx {max_bytes} bytes)"
        raise ModelRegistryError(msg)
    try:
        model = joblib.load(io.BytesIO(buf))
    except Exception as e:
        raise ModelRegistryError(f"pickle/joblib inválido: {e}") from e
    if not hasattr(model, "predict"):
        raise ModelRegistryError("El modelo debe tener método predict")


def validate_onnx_buffer(buf: bytes, max_bytes: int) -> None:
    if len(buf) > max_bytes:
        msg = f"Archivo demasiado grande (máx {max_bytes} bytes)"
        raise ModelRegistryError(msg)
    tmp = settings.MODEL_CACHE_DIR / "_validate.onnx"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_bytes(buf)
    try:
        InferenceSession(str(tmp))
    except Exception as e:
        raise ModelRegistryError(f"ONNX inválido: {e}") from e
    finally:
        tmp.unlink(missing_ok=True)
