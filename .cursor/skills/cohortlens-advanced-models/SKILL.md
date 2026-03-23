---
name: cohortlens-advanced-models
description: Backend structure for ML lenses marketplace — IPFS, CohortRegistry (Sepolia), Postgres cache, Celery tasks, pickle/ONNX inference.
---

# CohortLens — Modelos avanzados (backend)

## Estructura

- `app/models/advanced/` — tipos de tarea (churn, ltv, toxicity).
- `app/models/registry.py` — `ModelRegistry`: resolución de `lens_id`, descarga desde IPFS, caché en disco.
- `app/models/examples/churn_model.py` — ejemplo entrenable.
- `app/services/ipfs_client.py` — subida al API Kubo (`/api/v0/add`).
- `app/services/registry_contract.py` — `registerLens`, `getLens`, `lensCount` (web3.py).
- `app/db/` — SQLAlchemy + tabla `lenses`.
- `app/tasks/model_tasks.py` — inferencia asíncrona Celery.
- **Una sola app Celery**: [`app/worker/celery_app.py`](../../../packages/backend-ai/app/worker/celery_app.py) incluye `app.tasks.model_tasks`.

## Variables

- `IPFS_API_URL` — ej. `http://127.0.0.1:5001` o `http://ipfs:5001` en Docker.
- `COHORT_REGISTRY_ADDRESS` — contrato en Sepolia.
- `REGISTRY_UPLOADER_PRIVATE_KEY` — firma `registerLens` (MVP custodial).
- `MODEL_CACHE_DIR` — caché local de artefactos.
- `DATABASE_URL` — Postgres.
- `REQUIRE_WALLET_AUTH` — `true` para exigir firma en `/predict`.

## Comandos

```bash
cd packages/backend-ai
alembic upgrade head   # migraciones
uvicorn app.main:app --reload
celery -A app.worker.celery_app worker --loglevel=info
```
