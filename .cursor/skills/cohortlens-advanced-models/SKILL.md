---
name: cohortlens-advanced-models
description: Backend structure for ML lenses marketplace — IPFS, CohortRegistry (Sepolia), Postgres cache, Celery tasks, pickle/ONNX inference.
---

# CohortLens — Advanced models (backend)

## Layout

- `app/models/advanced/` — task types (churn, ltv, toxicity).
- `app/models/registry.py` — `ModelRegistry`: `lens_id` resolution, download from IPFS, on-disk cache.
- `app/models/examples/churn_model.py` — trainable example.
- `app/services/ipfs_client.py` — upload to Kubo API (`/api/v0/add`).
- `app/services/registry_contract.py` — `registerLens`, `getLens`, `lensCount` (web3.py).
- `app/db/` — SQLAlchemy + `lenses` table.
- `app/tasks/model_tasks.py` — async Celery inference.
- **Single Celery app**: [`app/tasks/celery_app.py`](../../../packages/backend-ai/app/tasks/celery_app.py) with queues `ml_tasks`, `prediction_tasks`, `zk_tasks`.

## Environment

- `IPFS_API_URL` — e.g. `http://127.0.0.1:5001` or `http://ipfs:5001` in Docker.
- `COHORT_REGISTRY_ADDRESS` — contract on Sepolia.
- `REGISTRY_UPLOADER_PRIVATE_KEY` — signs `registerLens` (MVP custodial).
- `MODEL_CACHE_DIR` — local artifact cache.
- `DATABASE_URL` — Postgres.
- `REQUIRE_WALLET_AUTH` — `true` to require signature on `/predict`.

## Commands

```bash
cd packages/backend-ai
alembic upgrade head   # migrations
uvicorn app.main:app --reload
celery -A app.tasks.celery_app worker --loglevel=info -Q ml_tasks,prediction_tasks,zk_tasks
```
