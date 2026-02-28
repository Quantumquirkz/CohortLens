# CohortLens Migration Matrix (v1 Python -> v2 TypeScript)

## Scope Status

- `apps/api` (FastAPI): **legacy active** during migration.
- `frontend/` (Next.js): **legacy active** client during migration.
- `apps/web/` (Next.js scaffold): **legacy scaffold** (no new feature work).
- `apps/api-ts` (NestJS): **new v2 backend**.
- `apps/mobile` (Expo RN + web): **new primary client target**.

## Endpoint Equivalence

| v1 (Python) | v2 (Nest) | Status | Notes |
|---|---|---|---|
| `POST /api/v1/token` | `POST /api/v2/auth/token` | Implemented | JSON body in v2 (`username`, `password`) |
| `GET /api/v1/health` | `GET /api/v2/health` | Implemented | Adds `timestamp` |
| `GET /api/v1/usage` | `GET /api/v2/usage` | Implemented | JWT required in v2 |
| `POST /api/v1/predict-spending` | `POST /api/v2/predict-spending` | Implemented | Rule-based prediction (`rule_version`) |
| `POST /api/v1/segment` | `POST /api/v2/segment` | Implemented | Stable heuristic clusters |
| `POST /api/v1/recommendations/natural` | `POST /api/v2/recommendations/natural` | Implemented | Groq if key exists, else rule fallback |
| `GET /api/v1/drift` | N/A | Deferred | Out of MVP |
| `POST /api/v1/reports/generate` | N/A | Deferred | Out of MVP |
| `GET /api/v1/audit-log` | N/A | Deferred | Out of MVP public endpoint |
| `POST /api/v1/consent/register` | N/A | Deferred | Out of MVP |

## Client Mapping

- New shared contracts/client: `packages/contracts`.
- New mobile+web shared RN app: `apps/mobile`.
- Legacy Next.js stays available while parity is validated.

## Breaking Differences in MVP

1. No sklearn/shap parity in v2; deterministic rules are used.
2. `token` endpoint in v2 expects JSON body.
3. `predict` and `segment` include `rule_version` in response.
4. v2 applies plan usage checks on MVP analytics endpoints.
