# Deployment

## Local

**API**
```bash
pip install -r apps/api/requirements.txt && pip install -e apps/api
cd apps/api && uvicorn main:app --reload
```
API at http://localhost:8000. Docs: /docs and /redoc.

**Web**
```bash
pnpm install && pnpm --filter @cohortlens/web dev
```

**Docker (API only)**
```bash
docker compose -f deployment/docker-compose.yml up --build
```
Port 8000. Mount `data/` and `reports/` if needed (already in the compose).

## Vercel (frontend)

- Set project root in Vercel to **apps/web** (or monorepo root with build command `pnpm --filter @cohortlens/web build`).
- Environment variables: `NEXT_PUBLIC_API_URL` pointing to the API in production.

## API in production

Deploy **apps/api** on Railway, Render, Fly.io, or similar (or Vercel with `apps/api/vercel.json`). Python 3.9+, install with `pip install -r apps/api/requirements.txt` and `pip install -e apps/api`; start with `uvicorn main:app --host 0.0.0.0 --port 8000`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATA_SOURCE` | `csv` or `neon` |
| `NEON_DATABASE_URL` | Required when `DATA_SOURCE=neon` |
| `JWT_SECRET` | JWT signing key (change in production) |
| `DEFAULT_AUTH_USER` / `DEFAULT_USER_PASSWORD` | Default user |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Subscriptions |
| `GROQ_API_KEY` | Groq API key for RAG (natural-language recommendations). Get at https://console.groq.com |
| `GROQ_MODEL` | Optional. Default from config (e.g. llama-3.3-70b-versatile) |

Copy `.env.example` to `.env` and fill in.

## Migrate CSV to Neon

```bash
export NEON_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
python scripts/migrate_csv_to_neon.py [path/to/Customers.csv]
```
