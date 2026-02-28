# CohortLens API v2 (NestJS)

TypeScript backend for the migration away from Python.

## Endpoints (MVP)

- `POST /api/v2/auth/token`
- `GET /api/v2/health`
- `GET /api/v2/usage`
- `POST /api/v2/predict-spending`
- `POST /api/v2/segment`
- `POST /api/v2/recommendations/natural`

## Run

```bash
pnpm --filter @cohortlens/api-ts install
pnpm --filter @cohortlens/api-ts prisma:generate
pnpm --filter @cohortlens/api-ts dev
```

Swagger: `/api/v2/docs`
