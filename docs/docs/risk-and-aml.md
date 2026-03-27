# Risk intelligence y AML (MVP)

CohortLens expone **señales de comportamiento** derivadas del subgrafo **Aave v3** (p. ej. Polygon). Esto **no** sustituye KYC, KYB, listas sancionadas ni programas AML regulatorios: es una capa técnica de **Behavior Intelligence** para equipos que ya tienen marcos de cumplimiento.

## API (FastAPI)

- `POST /api/v1/risk/screen` — decisión en línea; cabecera opcional `X-Risk-Api-Key` si `RISK_API_KEYS` está definido.
- `POST /api/v1/risk/batch` — encola trabajo Celery (cola `aml_tasks`).
- `GET /api/v1/risk/batch/{job_id}` — estado y resultados.
- `GET|PATCH /api/v1/risk/cases`, `GET /api/v1/risk/cases/{id}`, `POST /api/v1/risk/cases/{id}/notes`, `GET .../graph-mvp`.
- `POST /api/v1/alerts/webhook` — registro de webhooks salientes (payload firmado `X-CohortLens-Signature: sha256=...`).

La especificación OpenAPI se genera desde el backend; tras levantar `uvicorn`, sincronice con `docs/scripts/sync-openapi.mjs` (ver [api](./api.md)).

## Datos y límites

- **Alcance indexado**: operaciones Aave v3 por usuario; agregados de volumen/conteo en entidad `User` del subgrafo.
- **No indexado en MVP**: transferencias ERC-20 genéricas, puentes, DEX: los patrones tipo “wash” P2P requieren subgrafos o ingestas adicionales.

## Operación y métricas

- **SLO**: objetivo de latencia documentado en despliegue (caché Redis de *features*, modo degradado si el subgrafo falla).
- **Precision@k / FPR**: mida con etiquetas de analista (`analyst_label` en casos) y exporte histogramas vía Prometheus en el backend existente.
- **Retención**: defina política en Postgres (`risk_decisions`, `feature_snapshots`, `risk_cases`) según jurisdicción.

## Celery

Incluya la cola `aml_tasks` al arrancar el worker:

```bash
celery -A app.tasks.celery_app worker -Q ml_tasks,prediction_tasks,zk_tasks,aml_tasks --loglevel=info
```

## Frontend

Rutas bajo `packages/frontend/app/risk/`. Para entornos con clave, defina `NEXT_PUBLIC_RISK_API_KEY` (solo para demos; en producción prefiera proxy B2B sin exponer secretos en el navegador).
