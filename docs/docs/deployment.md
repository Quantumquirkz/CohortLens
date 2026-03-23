---
sidebar_position: 3
---

# Deployment

## Local (Docker Compose)

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

- Backend health: `http://localhost:8000/health`
- Frontend: `http://localhost:3000`

## Production

- **Backend**: use [`packages/backend-ai/Dockerfile.prod`](https://github.com/Quantumquirkz/CohortLens/tree/main/packages/backend-ai/Dockerfile.prod) and environment variables from `.env.production.example` (see repository root and package folders).
- **Frontend**: use [`packages/frontend/Dockerfile.prod`](https://github.com/Quantumquirkz/CohortLens/tree/main/packages/frontend/Dockerfile.prod) or host on **Vercel** / static export as configured in CI.
- **Database**: run `alembic upgrade head` (see `scripts/migrate.sh`).
- **Contracts**: deployment addresses are recorded under `packages/contracts/deployments/` (e.g. `mainnet.json`). Prefer **Gnosis Safe** for governance ownership; avoid long-lived deployer keys in automation.

## CI/CD

GitHub Actions workflows (`.github/workflows/`) run tests, linters, static analysis, and optional deploy steps. Use **GitHub Environments** with required reviewers for production.
