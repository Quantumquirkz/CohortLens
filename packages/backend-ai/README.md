# CohortLens Backend AI

API FastAPI para descubrimiento de cohortes (K-Means) sobre métricas agregadas desde un **subgraph** (Aave v3) y registro opcional en el contrato **CohortOracle** en Sepolia, con cumplimiento asíncrono vía **Redis + Celery**.

## Requisitos

- Python 3.11 o 3.12
- Redis (colas Celery y claves `oracle:pending:*`)
- Subgraph desplegado y accesible por HTTP (`SUBGRAPH_URL`)
- Para oracle on-chain: contrato desplegado en Sepolia y claves con ETH (requester) y owner (fulfill)

## Variables de entorno

Copia `.env.example` a `.env` y ajusta valores. Resumen:

| Variable | Descripción |
|----------|-------------|
| `SUBGRAPH_URL` | URL HTTP del endpoint GraphQL del subgraph (p. ej. Graph Node local en `http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3`). |
| `SEPOLIA_RPC_URL` | RPC JSON-RPC de Sepolia. |
| `COHORT_ORACLE_ADDRESS` | Dirección del `CohortOracle` desplegado. |
| `COHORT_LENS_ID` | `lensId` pasado a `requestPrediction`. |
| `ORACLE_REQUESTER_PRIVATE_KEY` | Clave que firma `requestPrediction` (sin `0x` opcional según cliente). |
| `ORACLE_OWNER_PRIVATE_KEY` | Clave del **owner** del contrato; solo debe usarse en el worker Celery para `fulfillRequest`. |
| `REDIS_URL` | Redis para pendientes de oracle y puntero de bloque. |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Broker/resultados Celery (típicamente Redis). |
| `ORACLE_FROM_BLOCK` | Primer bloque a escanear si no hay puntero en Redis. |
| `ORACLE_SCAN_CHUNK_BLOCKS` | Tamaño de ventana de bloques por tanda en el worker. |
| `IPFS_API_URL` | API HTTP de Kubo (p. ej. `http://127.0.0.1:5001` o `http://ipfs:5001` en Docker). |
| `COHORT_REGISTRY_ADDRESS` | Contrato `CohortRegistry` en Sepolia para `registerLens` / lectura de lentes. |
| `REGISTRY_UPLOADER_PRIVATE_KEY` | Clave que firma `registerLens` en el flujo de subida (MVP custodial; documentar para producción). |
| `MODEL_CACHE_DIR` | Directorio donde se cachean artefactos descargados por CID. |
| `MAX_UPLOAD_BYTES` | Tamaño máximo del multipart de subida de modelo. |
| `REQUIRE_WALLET_AUTH` | Si `true`, `POST /api/v1/models/{id}/predict` exige cabeceras `X-Wallet-Address`, `X-Wallet-Signature`, `X-Wallet-Nonce` (nonce vía `GET /api/v1/auth/nonce`). |

Si faltan `COHORT_ORACLE_ADDRESS` o `ORACLE_REQUESTER_PRIVATE_KEY`, el endpoint `/discover` **no** llama al contrato y devuelve solo cohortes (`oracle_request_id` nulo).

### Marketplace de modelos (Fase 5)

- **Pickle / joblib y ONNX**: la API valida buffers antes de aceptarlos; **pickle solo de fuentes confiables** (riesgo de ejecución arbitraria).
- **Flujo de subida**: `POST /api/v1/models/upload` (multipart) → IPFS (`add`) → `registerLens` on-chain → fila en Postgres (`lenses`).
- **Predicción**: `POST /api/v1/models/{id}/predict` (sync) o con `?async_mode=true` + Celery; estado en `GET /api/v1/models/predictions/{task_id}`.
- **Migraciones**: `alembic upgrade head` (tabla `lenses`). En desarrollo también se crea esquema vía `create_all` al arrancar.
- **Script de ejemplo**: `python scripts/train_churn_model.py` genera un pickle y puede subirlo si defines `COHORTLENS_UPLOAD_URL` o `--upload-url`.

## Desarrollo local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Celery (oracle)

En terminales separadas (con Redis en marcha):

```bash
celery -A app.worker.celery_app worker --loglevel=info
celery -A app.worker.celery_app beat --loglevel=info
```

La tarea `scan_and_fulfill_oracle` se ejecuta cada 30 s, lee eventos `PredictionRequested`, recupera el resultado gzip en Redis (`oracle:pending:<id>`) y envía `fulfillRequest`.

## Flujo `/api/v1/cohorts/discover`

1. Consulta GraphQL: agrega por usuario `tx_count`, `volume`, `avg_gas` en el rango de bloques (`protocol` debe ser compatible con Aave v3, p. ej. `aave-v3`).
2. Ejecuta K-Means sobre las `features` solicitadas.
3. Si el oracle está configurado: construye un payload gzip para `input`, llama a `requestPrediction`, guarda en Redis el resultado gzip completo para el worker, y devuelve `oracle_request_id` y `oracle_tx_hash`.

## Docker

Desde la raíz del monorepo:

```bash
docker compose up --build backend-ai celery-worker celery-beat redis ipfs graph-node
```

Asegúrate de desplegar el subgraph con el nombre esperado en `SUBGRAPH_URL` o sobrescribe la variable. Para subidas de modelos, el servicio **ipfs** debe estar levantado; `backend-ai` y `celery-worker` usan `IPFS_API_URL=http://ipfs:5001` y el volumen `model_cache` para artefactos.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| POST | `/api/v1/cohorts/discover` | Descubrir cohortes |
| GET | `/api/v1/models` | Listar modelos (caché Postgres; `?sync_chain=true` opcional) |
| POST | `/api/v1/models/upload` | Subir artefacto y registrar lente |
| POST | `/api/v1/models/{id}/predict` | Inferencia (sync o async) |
| GET | `/api/v1/models/predictions/{task_id}` | Estado de tarea Celery |
| GET | `/api/v1/auth/nonce` | Nonce para firma de wallet |

## Codificación on-chain

- **Input** (`requestPrediction`): JSON gzip con `centroid_sha256`, `total_users`, `n_clusters`.
- **Result** (`fulfillRequest`): JSON gzip del `CohortResponse` completo (cohortes + totales).
