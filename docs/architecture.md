# Architecture

CohortLens is a monorepo: frontend (Next.js) and API (FastAPI) in one repo, ready to deploy as a SaaS.

## Overview

```
apps/web/     → Next.js 14+ (Vercel). Login, dashboard, segments, predictions, reports.
apps/api/     → FastAPI + cohort_lens package. REST, GraphQL, auth, plan limits.
packages/     → ui, config, types (shared between web and API).
config/       → config.yaml (paths, models, reporting).
```

- **Web:** Routes under `app/(auth)` and `app/(dashboard)`. Calls go to the backend via API.
- **API:** `main.py` exposes the FastAPI app. Business logic lives in `apps/api/cohort_lens/`.

## Data flow (backend)

```
Load data (CSV or Neon DB) → Clean → Segment (clusters) → Predict spending
                                                          → Analyze → Recommend → HTML/PDF report
```

## Backend modules (cohort_lens)

| Area | What it does |
|------|----------------|
| **data** | Load CSV, validate with Pandera, clean, persist to Neon, audit, drift detection. |
| **features** | Segmentation (KMeans/GMM/DBSCAN) and spending prediction (regression/random forest). |
| **insights** | Stats, correlations, segment recommendations, RAG (natural-language recommendations). |
| **visualization** | Charts and executive reports (HTML/PDF). |
| **api** | REST, GraphQL, JWT, rate limit, per-tenant usage, subscriptions (Stripe). |
| **web3** | Consent records and optional IPFS for reports. |

## SaaS

- JWT authentication per user/tenant.
- Plan limits (basic / professional / enterprise) in Neon.
- API usage tracked per tenant; Stripe for subscriptions.
- Config in `config/config.yaml`; secrets in `.env`.
