# CohortLens Roadmap & Pending Tasks

Prioritized list of improvements and pending tasks to bring the project to a full production state and maximize value.

---

## 1. Database & Architecture

- ~~**SQLAlchemy async (asyncpg)**~~
  *Pending:* The roadmap indicates SQLAlchemy 2.0 + asyncpg. Optionally migrate to `create_async_engine` for better concurrency in the API.

- ✅ **Real use of `audit_log`**
  Implemented in `src/cohort_lens/data/audit.py`. Audit logging is recorded for: consents, reports, predictions, segments, and Stripe webhooks.

- ✅ **Persist segments and predictions in Neon**
  Implemented in `src/cohort_lens/data/persistence.py`. Prediction and segmentation endpoints persist results in Neon with `model_version` and `features_snapshot`.

- **Time-based Partitioning**
  For high-volume tables (`audit_log`, `predictions`), implement partitioning by `created_at` (e.g., by month) as per [DB_SCHEMA.md](DB_SCHEMA.md).

- **FK Reference in `segments`**
  In `init_neon.sql`, `segments.customer_id` does not have `REFERENCES customers(customer_id)`. Add the FK for referential integrity.

---

## 2. Authentication & Authorization

- **Multi-tenant in JWT**
  Include `tenant_id` (or equivalent) in the token besides `sub`, and use it consistently in limits and data filters.

- **Real User Management**
  Replace the default user (admin/admin) with registration and login against Neon: `users` table (id, email, password_hash, tenant_id, role) and full OAuth2 flows.

- ✅ **GraphQL Protection**
  Implemented: all sensitive GraphQL queries and mutations require JWT Bearer authentication.

- **Refresh Tokens**
  Implement refresh token (and rotation) to avoid relying solely on short-lived access tokens.

---

## 3. Monetization & Stripe

- **Checkout Flow**
  Page or endpoint that generates a Stripe Checkout link (or Payment Link) to subscribe to a plan (basic/professional/enterprise) and associate `metadata.tenant_id` and `metadata.plan`.

- ✅ **Neon Usage Persistence**
  Implemented in `src/cohort_lens/api/usage.py`. The `api_usage` table persists counters per tenant/month in Neon with atomic UPSERT. Integrated into `require_premium`.

- **`max_customers` Limit**
  Enforce the plan limit when loading data or migrating: reject or warn if the number of customers exceeds the tenant's `max_customers`.

- ✅ **Stripe Webhook: More Events**
  Implemented: `invoice.paid` and `customer.subscription.trial_will_end` are handled in addition to created/updated/deleted.

---

## 4. AI & Data Science

- **Real LSTM/Transformer**
  Replace the `lstm` stub in [prediction.py](../src/cohort_lens/features/prediction.py) with a real model (time series or tabular with PyTorch), with training and model serialization.

- **LIME as an alternative to SHAP**
  Roadmap mentions SHAP/LIME. Add option in config and endpoint for explainability with LIME when SHAP is not suitable.

- **RAG with Custom Embeddings**
  Improve recommendations RAG: index segments/insights in a vector store (e.g., embeddings in Neon with pgvector or FAISS) and retrieve by similarity before calling the LLM.

- ✅ **Real Data Drift**
  Implemented in `src/cohort_lens/data/drift.py`. Drift detection with PSI and KS test, baseline saving/loading, and REST + GraphQL endpoints to query and save baselines.

- **Retraining & Model Versioning**
  Pipeline to retrain segmentation and prediction, save artifacts (joblib/ONNX) with versioning, and persist `model_version` in `segments`/`predictions`.

---

## 5. Web3 & Decentralization

- **DIDs & Verifiable Credentials**
  Integrate issuance/verification of VCs linked to consents: write to `verifiable_credentials` and optionally link to `user_consents.verifiable_credential_id`.

- **Real Tokenization (Polygon/Solana)**
  In [tokens.py](../src/cohort_lens/web3/tokens.py), `compute_reward_tokens` and `get_wallet_balance` are placeholders. Connect with wallet/contract for real rewards and balance.

- **Data Market (MVP)**
  Minimum "data offering" flow with consent: list available datasets, permissions, and (optional) prices or token incentives.

- **IPFS: Pinata/Infura**
  Document and support IPFS via Pinata or Infura in addition to the local node, for reports and artifacts in cloud environments.

---

## 6. API & Developers

- ✅ **Reports API**
  Implemented: `POST /api/v1/reports/generate` generates an executive report with selectable metrics/figures, optionally uploads to IPFS. Also available via GraphQL mutation.

- ✅ **GraphQL: More Operations**
  Implemented: queries (customers, customer_by_id, segment_profiles, consent_status, data_drift) and mutations (predict_spending, register_consent, generate_report).

- **API Versioning**
  Clear versioning strategy (v1 path already exists); document deprecation policy and breaking changes.

- ✅ **IP-based Rate Limiting**
  Implemented in `src/cohort_lens/api/rate_limit.py`. Sliding window middleware with `X-RateLimit` headers. Configurable via `RATE_LIMIT_PER_MINUTE` environment variable.

- ✅ **OpenAPI: Examples & Descriptions**
  Implemented: all Pydantic models include `json_schema_extra` with examples, and endpoints have organizational tags.

---

## 7. User Experience (UX)

- **Support Chatbot**
  Roadmap Phase 5: chatbot (e.g., RAG over docs/API) for support and onboarding.

- **Dashboard: Auth & Multi-tenant**
  Connect the dashboard (Streamlit) with login (JWT or session) and filter data by tenant.

- **PDF Reports**
  Config already has `format: html | pdf`. Implement PDF generation (WeasyPrint already in requirements) and download option.

- **Scheduled Reports**
  Allow scheduling reports (cron or queue) per tenant and sending via email or saving to IPFS/Neon.

- **Metrics/Figures Selector in UI**
  In the dashboard or a "generate report" page, allow choosing metrics and figures before generating (backend already supported).

---

## 8. Testing & Quality

- ✅ **API Tests (REST & GraphQL)**
  Implemented in `src/tests/test_api.py`. Tests with FastAPI `TestClient` for: health, auth, predict, segment, drift, reports, consent, webhooks, rate limiting, and GraphQL.

- **Tests with Neon (Integration)**
  Tests using a test DB (Neon branch or SQLite for CI) for loader, migration, subscriptions, and consent.

- **Load Testing**
  Script or suite (Locust/k6) to validate performance under load (predict, segment, health).

- ✅ **Minimum Coverage**
  Coverage target (≥50% in CI, target 80%); execution in CI with `pytest-cov --cov-fail-under=50`.

---

## 9. DevOps & Deployment

- ✅ **CI/CD**
  Improved pipeline in `.github/workflows/ci.yml`: lint (ruff), multi-Python tests (3.10-3.12), coverage, security analysis, and package build.

- **Secrets & Configuration**
  Use environment variables or a vault in production; no secrets in the repo; document all variables in [DEPLOYMENT.md](DEPLOYMENT.md) and [.env.example](../.env.example).

- ✅ **Advanced Health Check**
  Implemented: `/api/v1/health` verifies connection to Neon DB and (optional) IPFS; returns 'ok' or 'degraded' status.

- **Structured Logging**
  JSON logs with level, `request_id`, and `tenant_id` for aggregation (Datadog, CloudWatch, etc.).

- **Metrics & Observability**
  Expose metrics (Prometheus/OpenMetrics) or APM integration for latency, errors, and usage per endpoint/tenant.

---

## 10. Documentation & Product

- **Onboarding Guide**
  Document or flow: registration, first login, data loading (CSV or Neon), first report, and API usage.

- **Changelog & Releases**
  Maintain CHANGELOG.md and tag versions (semver) for deployments and communicating updates.

- **Updated Architecture**
  If [ARCHITECTURE.md](ARCHITECTURE.md) exists, update it with Neon, auth, Stripe, IPFS, and current data flows.

- **Privacy Policy & Terms**
  For public SaaS: privacy, consent, and terms of use texts; link them from the dashboard or app.

---

## Suggested Prioritization (Impact Order)

| Priority | Area              | Key Actions | Status |
|----------|-------------------|-------------|--------|
| High     | Monetization      | ✅ Persist usage in Neon; Stripe checkout; max_customers limit | Partial |
| High     | Auth              | Users in Neon; tenant_id in JWT; ✅ protect GraphQL | Partial |
| High     | Testing           | ✅ API Tests (REST + auth); Neon integration tests | Partial |
| Medium   | Database          | ✅ Real audit log; ✅ persist segments/predictions; async optional | Partial |
| Medium   | API               | ✅ Report generation endpoint; ✅ IP rate limit | Completed |
| Medium   | AI                | ✅ Real data drift; retraining and versioning | Partial |
| Low      | Web3              | DIDs/VC; real tokenization; MVP data market | Pending |
| Low      | UX                | Chatbot; dashboard with auth; PDF & scheduled reports | Pending |
| Low      | DevOps            | ✅ CI/CD; ✅ advanced health; structured logging | Partial |

---

*Document updated on 2026-02-23 with progress from current sprint.*
