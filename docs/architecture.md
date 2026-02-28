# CohortLens — Architecture

## Overview

CohortLens is a TypeScript monorepo (pnpm workspaces + Turborepo) with two active applications and a shared contracts package.

```
apps/
  api-ts/     → NestJS + Prisma + Neon PostgreSQL  (REST API /api/v2)
  web/        → React + Express + Vite (SPA + Express server on :5000)
packages/
  contracts/  → Zod schemas + typed API client (shared between apps)
```

## Request Flow

```
Browser (React SPA)
  └─ apps/web Express server (:5000)
       └─ /api/* routes → Neon PostgreSQL (Drizzle ORM)
  └─ CohortLensApiClient (@cohortlens/contracts)
       └─ POST /api/v2/auth/token         → JWT
       └─ GET  /api/v2/health             → service status
       └─ POST /api/v2/predict-spending   → spending score
       └─ POST /api/v2/segment            → cluster assignment
       └─ POST /api/v2/recommendations/natural → AI recommendation
       └─ GET  /api/v2/usage              → tenant API usage
       └─ POST /api/v2/admin/*            → feature flag control (JWT)
```

## Web App (`apps/web`)

| Layer | Technology |
|---|---|
| Server | Express 5 |
| Bundler | Vite 7 |
| UI Framework | React 18 |
| Router | Wouter |
| Components | shadcn/ui (Radix UI primitives) |
| Styles | Tailwind CSS 3 |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| ORM | Drizzle ORM + Neon Serverless |
| Themes | Light / Dark (pure black) |

### Page structure

```
client/src/
  App.tsx              → Router + QueryProvider + ThemeProvider
  pages/
    dashboard.tsx      → Health, DB status, IPFS, usage overview
    predict.tsx        → Spending score prediction form
    segment.tsx        → K-Means cluster visualization
    recommendations.tsx → AI chat interface (Groq LLM)
    drift.tsx          → PSI + KS data drift monitor
    reports.tsx        → PDF/CSV/JSON report generator
    audit.tsx          → Immutable audit log viewer
    consent.tsx        → SSI/DID consent registry
    web3.tsx           → IPFS, ZK identity, tokenization
    usage.tsx          → Per-tenant API call tracking
  components/
    layout.tsx         → Sidebar + header + theme switcher
    cohortlens-logo.tsx → SVG logo component (theme-aware)
    ui/                → ~40 shadcn/ui components
  hooks/
    use-cohort.ts      → TanStack Query hooks for all endpoints
    use-theme.tsx      → Light/Dark theme management
    use-toast.ts       → Toast notifications
```

### Server structure

```
server/
  index.ts     → Express server entry point
  routes.ts    → All REST handlers (/api/*)
  storage.ts   → In-memory storage (audit + consent)
  db.ts        → Neon DB connection (Drizzle ORM)
  vite.ts      → Vite dev middleware integration
shared/
  schema.ts    → Zod schemas for all endpoints
```

## Backend (`apps/api-ts`)

| Layer | Technology |
|---|---|
| Framework | NestJS 10 |
| Language | TypeScript 5 (strict) |
| ORM | Prisma 6 + Neon PostgreSQL |
| Auth | JWT (HS256) via `@nestjs/passport` |
| Rate limiting | `@nestjs/throttler` (1000 req/min general, 10 req/min auth) |
| AI | Groq API (`llama-3.3-70b`) with rule-based fallback |
| Docs | Swagger/OpenAPI at `/api/v2/docs` |
| Tests | Jest + Supertest (53 e2e tests) |

### Module structure

```
src/
  main.ts              → Bootstrap, CORS, ValidationPipe, Swagger
  app.module.ts        → Root module, ThrottlerModule, FeatureFlagMiddleware
  auth/                → JWT auth (login, strategy, guard)
  analytics/           → predict-spending, segment, recommendations, health, usage
  common/              → AdminController, FeatureFlagService, FeatureFlagMiddleware
  prisma/              → PrismaService (DB connection)
```

### Database schema (Neon PostgreSQL)

| Table | Purpose |
|---|---|
| `users` | Auth credentials + tenant assignment |
| `customers` | Customer demographics |
| `predictions` | Historical spending predictions |
| `segments` | Historical cluster assignments |
| `api_usage` | Per-tenant monthly API call counts |
| `subscriptions` | Tenant plan + limits |
| `audit_log` | Change history |
| `feature_flags` | Persistent feature flag state |

### Feature flag system

Flags are stored in `feature_flags` table (persistent across restarts) with env var fallback:

| Flag | Default | Purpose |
|---|---|---|
| `v2_enabled` | false | Enable v2 API globally |
| `v2_primary` | false | Route all traffic to v2 |
| `v1_deprecated` | false | Return 410 Gone for v1 endpoints |
| `shadow_mode` | false | Mirror traffic to v2 silently |
| `migration_logging` | false | Log migration traffic details |

Control via Admin API (JWT required):
```bash
# Enable shadow mode
curl -X POST /api/v2/admin/enable-shadow-mode \
  -H "Authorization: Bearer $TOKEN"

# Cutover to v2
curl -X POST /api/v2/admin/migrate-to-v2 \
  -H "Authorization: Bearer $TOKEN"

# Emergency rollback
curl -X POST /api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $TOKEN"
```

## Shared packages (`packages/contracts`)

The `@cohortlens/contracts` package provides:
- **Zod schemas** for all request/response types (type-safe validation)
- **`CohortLensApiClient`** — typed HTTP client

Both apps share the same type definitions, ensuring no drift between API and client.

## CI/CD (`.github/workflows/ci-ts.yml`)

```
push/PR → main
  ├── pnpm install
  ├── prisma generate
  ├── typecheck: contracts, api-ts
  ├── e2e tests: api-ts (53 tests)
  └── unit tests: api-ts
```
