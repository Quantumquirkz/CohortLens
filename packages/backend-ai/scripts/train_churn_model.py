#!/usr/bin/env python3
"""Entrena un modelo churn sintético, lo guarda en pickle y opcionalmente lo sube vía API."""

from __future__ import annotations

import argparse
import io
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import httpx
import joblib

from app.models.examples.churn_model import train_churn_classifier


def main() -> None:
    p = argparse.ArgumentParser(description="Entrenar y exportar modelo churn")
    p.add_argument("--out", default="churn_model.pkl", help="Ruta del pickle de salida")
    p.add_argument(
        "--upload-url",
        default=os.environ.get("COHORTLENS_UPLOAD_URL"),
        help="POST multipart a esta URL (ej. http://localhost:8000/api/v1/models/upload)",
    )
    p.add_argument("--name", default="Churn demo")
    p.add_argument("--description", default="RandomForest churn (sintético)")
    p.add_argument("--model-type", default="churn", dest="model_type")
    p.add_argument("--price-wei", type=int, default=0)
    args = p.parse_args()

    clf = train_churn_classifier()
    joblib.dump(clf, args.out)
    print(f"Modelo guardado en {args.out}")

    if not args.upload_url:
        print("Sin --upload-url / COHORTLENS_UPLOAD_URL: solo archivo local.")
        return

    with open(args.out, "rb") as f:
        data = f.read()

    files = {"file": ("model.pkl", io.BytesIO(data), "application/octet-stream")}
    form = {
        "name": args.name,
        "description": args.description,
        "model_type": args.model_type,
        "price_per_query_wei": str(args.price_wei),
        "model_format": "pickle",
    }
    r = httpx.post(args.upload_url, files=files, data=form, timeout=120.0)
    print(r.status_code, r.text)


if __name__ == "__main__":
    main()
