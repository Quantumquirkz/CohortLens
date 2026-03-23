#!/usr/bin/env python3
"""Train a synthetic churn model, save as pickle, optionally upload via API."""

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
    p = argparse.ArgumentParser(description="Train and export churn model")
    p.add_argument("--out", default="churn_model.pkl", help="Output pickle path")
    p.add_argument(
        "--upload-url",
        default=os.environ.get("COHORTLENS_UPLOAD_URL"),
        help="POST multipart to this URL (e.g. http://localhost:8000/api/v1/models/upload)",
    )
    p.add_argument("--name", default="Churn demo")
    p.add_argument("--description", default="RandomForest churn (synthetic)")
    p.add_argument("--model-type", default="churn", dest="model_type")
    p.add_argument("--price-wei", type=int, default=0)
    args = p.parse_args()

    clf = train_churn_classifier()
    joblib.dump(clf, args.out)
    print(f"Model saved to {args.out}")

    if not args.upload_url:
        print("No --upload-url / COHORTLENS_UPLOAD_URL: local file only.")
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
