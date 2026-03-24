---
sidebar_position: 9
title: PostgREST, Hugging Face, and Gradio
---

# PostgREST, Hugging Face Hub, and Gradio

This stack extends CohortLens with:

- **PostgREST** — read-only REST access to the `lenses` table in Postgres, with row-level security (only `active = true` rows for the anonymous PostgREST role).
- **Hugging Face Hub** — optional `hf_repo_id` on each lens, allowlisted sync into the same model cache volume as IPFS artifacts.
- **Gradio** — separate lab UI that lists models and calls the FastAPI prediction API.

On-chain registration and IPFS CIDs remain the source of truth for production; HF is a complementary channel.

## Docker Compose profile `labs`

Start the extra services (PostgREST on host port **3003**, Gradio on **7860**):

```bash
docker compose --profile labs up --build
```

Apply migrations before relying on PostgREST (the `backend-ai` image runs `alembic upgrade head` on startup when `DATABASE_URL` is PostgreSQL).

## Environment variables

See the root `.env.example` and `packages/backend-ai/.env.example`. Notable values:

| Variable | Purpose |
| -------- | ------- |
| `POSTGREST_JWT_SECRET` | Shared HS256 secret between FastAPI (`POST /api/v1/auth/postgrest-token`) and the `postgrest` service (`PGRST_JWT_SECRET`). |
| `HF_TOKEN` | Optional Hub token for private repos. |
| `HF_ALLOWED_REPOS` | Comma-separated `org/model` list, or `*` for any (dev only). |
| `GRADIO_INTERNAL_API_KEY` | If set, Gradio sends `X-Internal-Key` on predict requests; when `REQUIRE_WALLET_AUTH=true`, this key satisfies auth for the lab. |
| `NEXT_PUBLIC_GRADIO_URL` | Browser URL for the Next.js `/lab` page link (default `http://localhost:7860`). |

## API shortcuts

- **HF link:** `PATCH /api/v1/hf/models/{lens_id}/link` with JSON `{"hf_repo_id": "org/model"}`.
- **HF sync:** `POST /api/v1/hf/models/{lens_id}/sync` downloads a snapshot under `MODEL_CACHE_DIR/hf_snapshots/`.
- **PostgREST token:** `POST /api/v1/auth/postgrest-token` with wallet headers (requires `POSTGREST_JWT_SECRET`); use `Authorization: Bearer <token>` against PostgREST.

## Security notes

- Pickle/joblib from any source (including HF) must follow the same trust model as the marketplace.
- Do not expose PostgREST on the public internet without a gateway, TLS, and strict network policies.
