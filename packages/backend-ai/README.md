# CohortLens Backend AI

FastAPI service for cohort discovery (K-Means) on metrics aggregated from a **subgraph** (Aave v3) and optional registration on the **CohortOracle** contract (e.g. Sepolia), with async fulfillment via **Redis + Celery**.

## Requirements

- Python 3.11 or 3.12
- Redis (Celery queues and `oracle:pending:*` keys)
- Deployed subgraph reachable over HTTP (`SUBGRAPH_URL`)
- For on-chain oracle: contract deployed on your target chain and keys with ETH (requester) and owner (fulfill)

## Environment variables

Copy `.env.example` to `.env` and adjust. Summary:

| Variable | Description |
|----------|-------------|
| `SUBGRAPH_URL` | HTTP GraphQL endpoint for the subgraph (e.g. local Graph Node at `http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3`). |
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC URL. |
| `COHORT_ORACLE_ADDRESS` | Deployed `CohortOracle` address. |
| `COHORT_LENS_ID` | `lensId` passed to `requestPrediction`. |
| `ORACLE_REQUESTER_PRIVATE_KEY` | Key that signs `requestPrediction` (`0x` optional depending on client). |
| `ORACLE_OWNER_PRIVATE_KEY` | Contract **owner** key; use only on the Celery worker for `fulfillRequest`. |
| `REDIS_URL` | Redis for oracle pending state and block pointer. |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Celery broker/result backend (typically Redis). |
| `ORACLE_FROM_BLOCK` | First block to scan if no pointer in Redis. |
| `ORACLE_SCAN_CHUNK_BLOCKS` | Block window size per scan batch in the worker. |
| `IPFS_API_URL` | Kubo HTTP API (e.g. `http://127.0.0.1:5001` or `http://ipfs:5001` in Docker). |
| `COHORT_REGISTRY_ADDRESS` | `CohortRegistry` on Sepolia for `registerLens` / lens reads. |
| `REGISTRY_UPLOADER_PRIVATE_KEY` | Key that signs `registerLens` in the upload flow (MVP custodial; harden for production). |
| `MODEL_CACHE_DIR` | Directory for cached artifacts downloaded by CID. |
| `MAX_UPLOAD_BYTES` | Maximum multipart upload size for models. |
| `REQUIRE_WALLET_AUTH` | If `true`, `POST /api/v1/models/{id}/predict` requires `X-Wallet-Address`, `X-Wallet-Signature`, `X-Wallet-Nonce` (nonce from `GET /api/v1/auth/nonce`). |
| `CHAINS_JSON` | JSON map of logical chains → `{ subgraph_url, rpc_url, cohort_oracle_address, cohort_registry_address, lens_token_address, staking_address }`. If empty, `SUBGRAPH_URL` and global RPC are used as chain `polygon`. |
| `REQUIRE_LENS_PAYMENT_FOR_DISCOVER` | If `true`, `POST /cohorts/discover` requires `payment_tx_hash` (user `requestPrediction` on-chain); `ORACLE_REQUESTER_PRIVATE_KEY` is not used. |
| `REQUIRE_STAKE_FOR_UPLOAD` | If `true`, `POST /api/v1/models/upload` requires `X-Wallet-Address` matching `REGISTRY_UPLOADER_PRIVATE_KEY` and sufficient on-chain stake (`staking_address` in `CHAINS_JSON`). |
| `ORACLE_SCAN_CHAIN` | Chain the Celery worker scans for `fulfill` (default `polygon`). |
| `COHORT_CACHE_TTL_SECONDS` | Redis TTL for clustering results (when oracle is not used). |
| `ENABLE_ZK_PROOF_FOR_ONNX` | If `true`, async ONNX predictions with `with_zk` generate a ZK bundle + IPFS. |
| `PROMETHEUS_ENABLED` | Exposes `/metrics` (HTTP histograms). |
| `HF_TOKEN` | Optional Hugging Face Hub token (private repos). |
| `HF_ALLOWED_REPOS` | Comma-separated `org/model` allowlist, or `*` (dev). |
| `POSTGREST_JWT_SECRET` | HS256 secret for `POST /api/v1/auth/postgrest-token` (must match PostgREST `PGRST_JWT_SECRET`). |
| `POSTGREST_JWT_EXPIRE_MINUTES` | Lifetime of PostgREST JWTs. |
| `GRADIO_INTERNAL_API_KEY` | When `REQUIRE_WALLET_AUTH=true`, `X-Internal-Key` on predict satisfies auth (for the Gradio lab container). |

If the oracle is not configured for the chain, `/discover` returns cohorts only (`oracle_request_id` null). When `REQUIRE_LENS_PAYMENT_FOR_DISCOVER=true`, the client must send a `payment_tx_hash` of a user `requestPrediction` transaction; otherwise the backend uses `ORACLE_REQUESTER_PRIVATE_KEY` as before.

### Model marketplace (phase 5)

- **Pickle / joblib and ONNX**: the API validates buffers before accept; **pickle only from trusted sources** (arbitrary code execution risk).
- **Upload flow**: `POST /api/v1/models/upload` (multipart) → IPFS (`add`) → `registerLens` on-chain → Postgres row (`lenses`).
- **Prediction**: `POST /api/v1/models/{id}/predict` (sync) or `?async_mode=true` + Celery; status at `GET /api/v1/models/predictions/{task_id}`.
- **Migrations**: `alembic upgrade head` (table `lenses` + optional `hf_repo_id` and PostgREST RLS on PostgreSQL). Docker images run `alembic upgrade head` on startup when `DATABASE_URL` starts with `postgresql`.
- **Hugging Face Hub**: `PATCH /api/v1/hf/models/{id}/link` with `{"hf_repo_id":"org/model"}`; `POST /api/v1/hf/models/{id}/sync` downloads a snapshot under `MODEL_CACHE_DIR/hf_snapshots/` (allowlist enforced).
- **PostgREST token**: `POST /api/v1/auth/postgrest-token` with wallet headers when `POSTGREST_JWT_SECRET` is set.
- **Example script**: `python scripts/train_churn_model.py` builds a pickle and can upload if you set `COHORTLENS_UPLOAD_URL` or `--upload-url`.

## Local development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Celery (oracle)

In separate terminals (with Redis running):

```bash
celery -A app.tasks.celery_app worker --loglevel=info -Q ml_tasks,prediction_tasks,zk_tasks
celery -A app.tasks.celery_app beat --loglevel=info
```

The `scan_and_fulfill_oracle` task runs every 30s, reads `PredictionRequested` events, loads the gzip result from Redis (`oracle:pending:<id>`), and sends `fulfillRequest`.

## GraphQL read BFF (`/graphql`)

The backend exposes a read-only GraphQL endpoint to reduce frontend overfetching while keeping
sensitive mutations in REST.

- Endpoint: `POST /graphql`
- Suggested env:
  - `GRAPHQL_ENABLED=true`
  - `GRAPHQL_INTROSPECTION=false` in production
  - `GRAPHQL_MAX_DEPTH=8`
  - `GRAPHQL_MAX_ALIASES=30`

Initial queries:

- `homeStatus`
- `models(...)` (filters + pagination)
- `model(id: Int!)`
- `dashboardSummary(protocol, chain, startBlock, endBlock)`
- `predictionTask(taskId: String!)`

## `/api/v1/cohorts/discover` flow

1. GraphQL: aggregate per user `tx_count`, `volume`, `avg_gas` over the block range (`protocol` must match Aave v3, e.g. `aave-v3`).
2. Run K-Means on the requested `features`.
3. If oracle is configured: build gzip payload for `input`, store the full gzip result in Redis for the worker, return `oracle_request_id` and `oracle_tx_hash`. Either the backend signs `requestPrediction` (legacy) or the client pre-paid on-chain and sends `payment_tx_hash` for verification.

## Docker

From the monorepo root:

```bash
docker compose up --build backend-ai celery-worker celery-beat redis ipfs graph-node prometheus grafana
```

Deploy the subgraph with the name expected in `SUBGRAPH_URL` / `CHAINS_JSON` or override the variable. For model uploads, **ipfs** must be up; `backend-ai` and `celery-worker` use `IPFS_API_URL=http://ipfs:5001` and the `model_cache` volume. **Prometheus** (port 9090) scrapes `backend-ai:8000/metrics`; **Grafana** on 3001 (admin via `GRAFANA_ADMIN_PASSWORD`).

### Scaling Celery workers

- Increase `celery-worker` replicas in Compose or run multiple processes with the same `-Q ml_tasks,prediction_tasks,zk_tasks`.
- For very high load, deploy workers on **Akash** (see `deploy/akash/README.md` at the monorepo root) pointing at the same Redis broker.

### New chains

Set `CHAINS_JSON`, for example:

```json
{
  "polygon": {
    "subgraph_url": "http://graph-node:8000/subgraphs/name/cohortlens/aave-v3",
    "rpc_url": "https://polygon-rpc.com",
    "cohort_oracle_address": "0x...",
    "cohort_registry_address": "0x..."
  },
  "ethereum": {
    "subgraph_url": "https://api.studio.thegraph.com/query/.../aave-v3-eth/v0.0.1",
    "rpc_url": "https://eth.llamarpc.com",
    "cohort_oracle_address": "",
    "cohort_registry_address": ""
  }
}
```

The body of `POST /api/v1/cohorts/discover` includes `chain` (default `polygon`).

### Akash

See [`deploy/akash/README.md`](../../deploy/akash/README.md): Docker image, env vars, and `scripts/deploy_akash.sh`.

### ZK proofs (EZKL)

- `ENABLE_ZK_PROOF_FOR_ONNX=true` and async prediction with `with_zk: true` (see `POST /api/v1/predictions/async`) produce a commitment-hash bundle and upload to IPFS.
- For full SNARK proofs, install the EZKL binary and extend `app/models/zk_prover.py` with your compiled artifacts.
- The `CohortOracle` contract exposes `registerPredictionProofHash` to store the hash on-chain (audit).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| POST | `/api/v1/cohorts/discover` | Discover cohorts |
| GET | `/api/v1/models` | List models (Postgres cache; optional `?sync_chain=true`) |
| POST | `/api/v1/models/upload` | Upload artifact and register lens |
| POST | `/api/v1/models/{id}/predict` | Inference (sync or `?async_mode=true`) |
| GET | `/api/v1/models/predictions/{task_id}` | Celery task status |
| POST | `/api/v1/predictions/async` | Enqueue inference (`lens_id`, `features`, optional `with_zk`) |
| GET | `/api/v1/predictions/{task_id}/status` | Same Celery queue status |
| GET | `/metrics` | Prometheus metrics (if `PROMETHEUS_ENABLED`) |
| GET | `/api/v1/auth/nonce` | Nonce for wallet signature |

## On-chain encoding

- **Input** (`requestPrediction`): gzip JSON with `centroid_sha256`, `total_users`, `n_clusters`.
- **Result** (`fulfillRequest`): gzip JSON of the full `CohortResponse` (cohorts + totals).
