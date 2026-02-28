# CohortLens Backend — Developer Guide

The backend is a NestJS application in `apps/api-ts/`. It exposes a REST API at `/api/v2/*` backed by Neon PostgreSQL via Prisma.

## Quick start

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Set environment variables
cp apps/api-ts/.env.example apps/api-ts/.env
# Edit .env: NEON_DATABASE_URL, JWT_SECRET, GROQ_API_KEY (optional)

# 3. Generate Prisma client
pnpm --filter @cohortlens/api-ts prisma:generate

# 4. Run migrations
pnpm --filter @cohortlens/api-ts prisma:migrate

# 5. Start dev server (port 8001, hot reload)
pnpm --filter @cohortlens/api-ts dev
```

Swagger UI: `http://localhost:8001/api/v2/docs`

## Environment variables

| Variable                          | Required | Description                              |
|-----------------------------------|----------|------------------------------------------|
| `NEON_DATABASE_URL`               | Yes      | PostgreSQL connection string             |
| `JWT_SECRET`                      | Yes      | JWT signing secret (min 32 chars)        |
| `GROQ_API_KEY`                    | No       | Groq LLM key (falls back to rule-based)  |
| `DEFAULT_AUTH_USER`               | No       | Seed admin username (default: `admin`)   |
| `DEFAULT_USER_PASSWORD`           | No       | Seed admin password (default: `admin`)   |
| `PORT`                            | No       | Server port (default: `8001`)            |
| `SKIP_DB`                         | No       | Skip DB connect for local dev (no Neon)  |
| `FEATURE_FLAG_V2_ENABLED`         | No       | Enable v2 API (default: `false`)         |
| `FEATURE_FLAG_V2_PRIMARY`         | No       | Route traffic to v2 (default: `false`)   |
| `FEATURE_FLAG_V1_DEPRECATED`      | No       | Return 410 for v1 (default: `false`)     |
| `FEATURE_FLAG_SHADOW_MODE`        | No       | Shadow mode (default: `false`)           |
| `FEATURE_FLAG_MIGRATION_LOGGING`  | No       | Migration logging (default: `false`)     |

## API endpoints

### Auth

| Method | Path                  | Auth | Body                          | Response              |
|--------|-----------------------|------|-------------------------------|-----------------------|
| POST   | `/api/v2/auth/token`  | —    | `{ username, password }`      | `{ access_token }`    |

### Analytics

| Method | Path                              | Auth | Description                  |
|--------|-----------------------------------|------|------------------------------|
| GET    | `/api/v2/health`                  | —    | Service + DB health          |
| GET    | `/api/v2/usage`                   | JWT  | Monthly API call count       |
| POST   | `/api/v2/predict-spending`        | JWT  | Predict spending score       |
| POST   | `/api/v2/segment`                 | JWT  | Assign cluster to customers  |
| POST   | `/api/v2/recommendations/natural` | JWT  | AI/rule-based recommendation |

#### `POST /api/v2/predict-spending`

```json
// Request
{
  "age": 35,
  "annual_income": 75000,
  "work_experience": 10,
  "family_size": 3,
  "profession": "Engineer"
}

// Response
{
  "predicted_spending": 72.5,
  "confidence": "high",
  "rule_version": "rules-v1"
}
```

#### `POST /api/v2/segment`

```json
// Request (array of customers)
[
  { "CustomerID": "C1", "Age": 25, "Annual Income ($)": 50000, "Spending Score (1-100)": 60 }
]

// Response
{
  "clusters": [2],
  "rule_version": "rules-v1"
}
```

Cluster meanings:
| Cluster | Name             |
|---------|------------------|
| 0       | Premium Active   |
| 1       | Premium Passive  |
| 2       | Budget Active    |
| 3       | Young Active     |
| 4       | Mature Passive   |
| 5       | Unclassified     |

#### `POST /api/v2/recommendations/natural`

```json
// Request
{ "query": "What are the best segments for upselling?" }

// Response
{
  "recommendation": "Focus on C0 and C2 segments...",
  "source": "groq"  // or "rule_based"
}
```

### Admin (JWT required)

| Method | Path                                    | Description                    |
|--------|-----------------------------------------|--------------------------------|
| GET    | `/api/v2/admin/health`                  | Admin health (public)          |
| GET    | `/api/v2/admin/flags`                   | Get all feature flags (public) |
| POST   | `/api/v2/admin/flags`                   | Set a feature flag             |
| POST   | `/api/v2/admin/migrate-to-v2`           | Activate v2 as primary         |
| POST   | `/api/v2/admin/rollback-to-v1`          | Emergency rollback             |
| POST   | `/api/v2/admin/enable-shadow-mode`      | Enable shadow mode             |
| POST   | `/api/v2/admin/complete-v1-deprecation` | Finalize v1 removal            |

## Database

### Migrations

```bash
# Create a new migration (requires NEON_DATABASE_URL)
cd apps/api-ts
npx prisma migrate dev --name your_migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset (dev only)
npx prisma migrate reset
```

### Prisma Studio (visual DB browser)

```bash
cd apps/api-ts && npx prisma studio
```

## Testing

```bash
# Run all e2e tests (53 tests, no DB required)
pnpm --filter @cohortlens/api-ts test:e2e

# TypeScript type check
pnpm --filter @cohortlens/api-ts lint

# Build
pnpm --filter @cohortlens/api-ts build
```

Tests use a Prisma stub — no real database needed. The `FEATURE_FLAG_V2_ENABLED=true` env var is set automatically in test setup.

## Rate limiting

- **Auth endpoint** (`POST /api/v2/auth/token`): 10 requests/minute per IP
- **All other endpoints**: 1000 requests/minute per IP
- **Health endpoint**: No rate limit (`@SkipThrottle`)

## Adding a new endpoint

1. Add Zod schema to `packages/contracts/src/schemas.ts`
2. Add method to `CohortLensApiClient` in `packages/contracts/src/client.ts`
3. Create DTO in `apps/api-ts/src/analytics/dto/`
4. Add method to `AnalyticsService`
5. Add route to `AnalyticsController`
6. Add e2e test in `apps/api-ts/tests/e2e/analytics.e2e-spec.ts`
7. Add web test in `apps/web/client/src/`
