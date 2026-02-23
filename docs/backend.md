# CohortLens Backend – Step-by-step guide

This document describes how the CohortLens backend (API and `cohort_lens` package) works, from start to finish.

---

## 1. Entry points

### 1.1 API server (FastAPI)

- **File:** `apps/api/main.py`
- **What it does:** Imports the FastAPI app from `cohort_lens.api.rest_api` and exposes it as `app`.
- **How to run:**  
  `uvicorn main:app --host 0.0.0.0 --port 8000` (from `apps/api/`).  
  Or via CLI: `cohortlens serve --host 0.0.0.0 --port 8000`.

### 1.2 CLI (Click)

- **File:** `apps/api/cohort_lens/cli.py` → delegates to `cohort_lens.api.cli.main`.
- **Commands:** `run`, `segment`, `predict`, `report`, `serve`.
- **How to run:** After `pip install -e apps/api`, the global command is `cohortlens`.

---

## 2. Configuration

### 2.1 Where config lives

- **YAML:** `config/config.yaml` (at monorepo root). The backend finds the root by walking up from the code file until it finds a `config/` directory with `config.yaml`.
- **Environment variables:** `.env` at the repo root (or system env). Loaded via `python-dotenv` in `cohort_lens.utils.config_reader.load_config()`.

### 2.2 What `config.yaml` defines

| Section | Purpose |
|---------|---------|
| **data** | `raw_path`, `processed_path`, `raw_filename` (paths to CSV). |
| **models** | `random_seed`; `segmentation`: algorithm (kmeans/dbscan/gmm), features, n_clusters, silhouette_range; `prediction`: target, numerical/categorical features, test_size, cv_folds. |
| **features** | Numerical/categorical columns and `id_column` (CustomerID). |
| **reporting** | format (html/pdf), save_path, figures_path, dpi, metrics and figures to include. |
| **logging** | level, format. |

### 2.3 How it is used in code

- **`load_config()`:** Loads YAML and env, stores in a global. Called at pipeline or CLI startup.
- **`get_config()`:** Returns the loaded config dict (or loads if not yet done).
- **`get_project_root()`:** Returns the project root path (where `config/config.yaml` lives).

All of this lives in `cohort_lens.utils.config_reader`.

---

## 3. HTTP request flow

### Step 1: Request hits FastAPI

- The app is defined in `cohort_lens.api.rest_api`. That is where `app = FastAPI(...)` is created and routes and middleware are registered.

### Step 2: Rate limiting (middleware)

- **Class:** `RateLimitMiddleware` (`cohort_lens.api.rate_limit`).
- **What it does:** Limits requests per minute per IP (default 60; `RATE_LIMIT_PER_MINUTE`).
- **Exempt:** `/docs`, `/redoc`, `/openapi.json`, `/api/v1/health`.

### Step 3: Route and dependencies

- Routes live in `rest_api.py` with prefix `/api/v1/`.
- If the endpoint is **premium** (segmentation, prediction, reports, etc.):
  1. **`require_auth`:** Resolves the user via `get_current_user` (Bearer JWT). If no token or invalid → 401.
  2. **`require_premium`:** After validating JWT, checks the tenant usage limit (Neon or in-memory). If exceeded → 429. Then increments the usage counter.

### Step 4: Endpoint logic

- Each endpoint calls into `cohort_lens.data`, `cohort_lens.features`, `cohort_lens.insights`, `cohort_lens.visualization`, etc., as required by the route.
- Data can come from CSV (cached in memory in the loader) or from Neon (`DATA_SOURCE=neon`).

### Step 5: Response

- FastAPI serializes the return value (Pydantic or dict) to JSON and sends the response.

---

## 4. Data layer (step by step)

### 4.1 Load customers

- **Function:** `load_customers(path=None, validate=True)` in `cohort_lens.data.loader`.
- **Step 1:** Reads `DATA_SOURCE` (env). If `neon`, calls `load_customers_from_db()` (Neon) and validates with Pandera if `validate=True`.
- **Step 2:** If `csv`: gets the CSV path from config (or uses `path` if provided). Reads CSV with pandas, normalizes "Annual Income ($)" to numeric, validates with `customer_schema` (Pandera), and caches in memory to avoid repeated reads.
- **Result:** DataFrame with columns defined in `cohort_lens.data.schemas.customer_schema`.

### 4.2 Clean data

- **Function:** `clean_customers(df)` in `cohort_lens.data.preprocessor`.
- **What it does:** Drops null and duplicate rows, resets index.
- **Usage:** Always after `load_customers` before segmenting or predicting.

### 4.3 Encode for prediction

- **Function:** `encode_for_prediction(df)` in `cohort_lens.data.preprocessor`.
- **What it does:** Reads from config the prediction model’s numerical and categorical columns and target. Builds X (numericals + OneHot of categoricals) and y (target). Returns `(X, y, encoder)`.
- **Usage:** To train the predictor or to predict from the API (with the same encoder).

### 4.4 Database (Neon)

- **Module:** `cohort_lens.data.db`.
- **`get_engine(database_url=None)`:** Creates the SQLAlchemy engine with `NEON_DATABASE_URL` (or the argument).
- **`create_schema(engine)`:** Creates tables if they do not exist (customers, audit, segments, predictions, etc., per `deployment/init_neon.sql` or equivalent).
- **`load_customers_from_db()`:** Reads all customers from Neon and returns a DataFrame.
- **`upsert_customers(df, engine=None)`:** Inserts or updates rows in the customers table (CSV → Neon migration script).

### 4.5 Audit

- **Module:** `cohort_lens.data.audit`.
- **`write_audit_log(...)`:** Writes to the audit table (action, tenant, details, timestamp).
- **`get_audit_log(...)`:** Reads audit entries (optional filters). Used by `/api/v1/audit-log`.

### 4.6 Persistence of results

- **Module:** `cohort_lens.data.persistence`.
- **`persist_segments(df_seg, ...)`:** Saves segments to Neon.
- **`persist_prediction(...)` / `persist_predictions_batch(...)`:** Save predictions.
- **`set_model_version(...)` / `get_model_version()`:** Model version for traceability.

### 4.7 Drift

- **Module:** `cohort_lens.data.drift`.
- **`save_baseline(df)`:** Saves reference statistics for later comparison.
- **`check_drift(df_actual)`:** Compares current data to the baseline (e.g. statistical tests) and returns whether drift is detected. Used by `/api/v1/drift` and `/api/v1/drift/save-baseline`.

---

## 5. Segmentation (step by step)

- **Module:** `cohort_lens.features.segmentation`.
- **Main function:** `fit_segments(df, n_clusters=None, random_state=None, algorithm=None)`.

**Internal steps:**

1. Reads from config: algorithm (kmeans/gmm/dbscan), features to use, k range for silhouette, seed.
2. Builds the feature matrix and scales it with `StandardScaler`.
3. If `n_clusters` is not provided and the algorithm is not DBSCAN, finds the best k in the range using **silhouette** (`_optimal_k_silhouette`).
4. Fits the model:
   - **KMeans:** KMeans with k-means++, n_init and max_iter from config.
   - **GMM:** GaussianMixture with n_components.
   - **DBSCAN:** DBSCAN(eps, min_samples); number of clusters is derived from labels.
5. Assigns labels to the DataFrame and returns `(df_with_Cluster, model, scaler)`.

**`interpret_segments(df)`:** Assigns human-readable labels to each cluster (e.g. "high value", "low engagement") from variable means. Used in recommendations and reports.

---

## 6. Prediction (step by step)

- **Module:** `cohort_lens.features.prediction`.
- **Main function:** `train_predictor(X, y)`.

**Steps:**

1. Reads from config: algorithm (linear_regression / random_forest), test_size, cv_folds.
2. Splits into train/test.
3. Trains the model (sklearn) and optionally runs cross-validation.
4. Computes metrics (MSE, MAE, R²) on the test set.
5. Returns `(trained_model, metrics_dict)`.

**In the API:** Models are loaded on demand (`_load_models()` in `rest_api.py`): data is loaded, cleaned, segmentation and prediction are trained once, then reused for `/api/v1/predict-spending` and SHAP explanations.

**`explain_prediction(...)`:** Uses SHAP to explain a customer’s prediction (which variables matter most). Used in `/api/v1/predict-spending/explain` and `.../{customer_id}/explain`.

---

## 7. Insights

- **Analytics:** `cohort_lens.insights.analyzer`  
  - `compute_descriptive_stats(df)`, `compute_correlation_matrix(df)`.
- **Recommendations:** `cohort_lens.insights.recommender`  
  - `compute_savings_metrics(df)` (income, estimated spend, savings %).  
  - `generate_segment_recommendations(df_seg)` (recommendations per segment; uses `interpret_segments`).
- **RAG:** `cohort_lens.insights.rag`  
  - `get_natural_recommendation(question, optional_context)` uses OpenAI/Anthropic for natural-language answers. Used in `POST /api/v1/recommendations/natural`.

---

## 8. Visualization and reports

- **Charts:** `cohort_lens.visualization.plots` (matplotlib/plotly): clusters, prediction vs actual, correlation, savings, etc.
- **Reports:** `cohort_lens.visualization.reports.generate_executive_report(...)` generates the executive report HTML (or PDF with WeasyPrint) with figures and recommendations. Used in the pipeline and in `POST /api/v1/reports/generate`.

---

## 9. Authentication

- **Module:** `cohort_lens.api.auth`.
- **Token:** JWT (HS256), secret in `JWT_SECRET`, expiry in `JWT_EXPIRE_MINUTES`.
- **`/api/v1/token`:** Accepts `username` and `password` (OAuth2 password flow). Checks user in Neon (`cohort_lens.data.users.get_user_by_username`) or default user (env `DEFAULT_AUTH_USER` / `DEFAULT_USER_PASSWORD`). If valid, returns `access_token` (JWT with `sub` = username or other tenant id).
- **Protected endpoints:** Use the `require_auth` dependency, which uses `get_current_user` (Bearer token → JWT verification → optional refresh from Neon). If the token is valid, the "user" (payload or user record) is passed to the endpoint.

---

## 10. Per-tenant usage and plans

- **Persistent (Neon):** `cohort_lens.api.usage`: `api_usage` table (tenant_id, month_key, call_count). `check_usage_limit_persistent(tenant_id)` compares against the plan limit; `increment_usage_persistent(tenant_id)` increments the counter.
- **Plans:** `cohort_lens.api.subscriptions`: plan limits (basic, professional, enterprise) in `PLAN_LIMITS` (max_api_calls_per_month, max_customers). The tenant’s subscription is read from Neon; if none, usage is unlimited (development).
- **Stripe webhook:** `POST /api/v1/webhooks/stripe` receives Stripe events (subscription created/cancelled, etc.) and updates state in Neon (`handle_stripe_subscription_event`, `end_subscription_by_stripe_id`).

---

## 11. REST endpoints list

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | No | Service status and Neon connectivity |
| POST | `/api/v1/token` | No | Get JWT (username/password) |
| POST | `/api/v1/predict-spending` | Premium | Spending prediction per customer (body: age, annual_income, …) |
| POST | `/api/v1/segment` | Premium | Segmentation (optional body with data); returns segments |
| POST | `/api/v1/recommendations/natural` | Premium | Natural-language recommendation (RAG) |
| GET | `/api/v1/predict-spending/explain` | Premium | SHAP explanation by query params |
| GET | `/api/v1/predict-spending/{customer_id}/explain` | Premium | SHAP explanation by customer ID |
| GET | `/api/v1/drift` | Premium | Check drift against baseline |
| POST | `/api/v1/drift/save-baseline` | Premium | Save baseline for drift |
| POST | `/api/v1/reports/generate` | Premium | Generate executive report (HTML/PDF) |
| GET | `/api/v1/audit-log` | Auth | List audit log |
| POST | `/api/v1/consent/register` | No | Register consent (SSI/web3) |
| GET | `/api/v1/consent/{customer_id}` | No | Consent status |
| GET | `/api/v1/usage` | Auth | Tenant API usage |
| POST | `/api/v1/webhooks/stripe` | Stripe signature | Stripe webhook for subscriptions |

- **GraphQL:** Mounted at `/graphql` (Strawberry); schema in `cohort_lens.api.graphql_schema`. Queries/mutations for segmentation, prediction, reports, consent, etc.

---

## 12. Full pipeline (CLI `cohortlens run`)

**Execution order** (`cohort_lens.pipeline.run_pipeline`):

1. **Config:** `load_config()`, create figures directory (reporting).
2. **Data:** `load_customers()` → `clean_customers()`.
3. **Segmentation:** `fit_segments(df)` → save cluster figure.
4. **Prediction:** `encode_for_prediction(df)` → `train_predictor(X, y)` → prediction vs actual figure.
5. **Analysis:** `compute_correlation_matrix(df)` → heatmap figure.
6. **Savings:** `compute_savings_metrics(df_seg)` → savings figure.
7. **Recommendations:** `generate_segment_recommendations(df_seg)`.
8. **Report:** `generate_executive_report(...)` with all figures and metrics → save HTML (or PDF) to the configured path.

Everything runs in-process; there is no job queue. The API reuses models loaded in memory after the first request that needs them.

---

## 13. Web3 / consent

- **Module:** `cohort_lens.web3.consent`.
- **`register_consent(...)`:** Registers a customer’s consent (type, timestamp, etc.) in Neon.
- **`get_consent_status(customer_id)`:** Returns that customer’s consent status.
- Optional: `cohort_lens.web3.ipfs_client` for uploading reports to IPFS; `tokens` for token/wallet logic if used.

---

## 14. Data flow summary

```
Config (YAML + .env)
       ↓
load_customers (CSV or Neon) → clean_customers → clean DataFrame
       ↓
       ├→ fit_segments → df with Cluster, model, scaler
       │       ↓
       │  interpret_segments, generate_segment_recommendations, compute_savings_metrics
       │
       └→ encode_for_prediction → (X, y, encoder)
                 ↓
           train_predictor → model, metrics
                 ↓
           explain_prediction (SHAP) for the API
```

The API exposes these steps as endpoints; the CLI and pipeline run them in sequence and write reports and figures to disk.
