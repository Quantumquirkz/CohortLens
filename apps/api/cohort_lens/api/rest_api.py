"""FastAPI REST API for CohortLens."""
import io
import os
import re
import threading
import uuid
from typing import Optional, List

import pandas as pd
import stripe
from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import text
from strawberry.fastapi import GraphQLRouter

from cohort_lens.api.auth import (
    require_auth,
    get_current_user,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    hash_password,
    validate_password_strength,
)
from cohort_lens.api.graphql_schema import schema
from cohort_lens.api.rate_limit import RateLimitMiddleware
from cohort_lens.api.subscriptions import (
    increment_api_usage,
    check_api_usage_limit,
    handle_stripe_subscription_event,
    end_subscription_by_stripe_id,
)
from cohort_lens.api.usage import (
    check_usage_limit_persistent,
    increment_usage_persistent,
    get_usage_persistent,
)
from cohort_lens.data import (
    load_customers,
    clean_customers,
    encode_for_prediction,
)
from cohort_lens.data.audit import write_audit_log, get_audit_log
from cohort_lens.data.db import get_engine
from cohort_lens.data.drift import check_drift, save_baseline
from cohort_lens.data.persistence import persist_segments, persist_prediction
from cohort_lens.data.users import create_user, get_user_by_username
from cohort_lens.features import fit_segments, train_predictor
from cohort_lens.features.prediction import explain_prediction
from cohort_lens.insights.rag import get_natural_recommendation
from cohort_lens.insights.recommender import generate_segment_recommendations
from cohort_lens.utils.config_reader import get_project_root, get_config
from cohort_lens.web3.consent import register_consent, get_consent_status
from cohort_lens.visualization.reports import generate_executive_report

app = FastAPI(
    title="CohortLens API",
    version="0.3.0",
    description="AI-powered customer intelligence platform for segmentation, spending prediction, and actionable insights.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---- CORS (so the frontend can call the API) ----
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Rate Limiting Middleware ----
app.add_middleware(
    RateLimitMiddleware,
    max_requests=int(os.environ.get("RATE_LIMIT_PER_MINUTE", "60")),
    window_seconds=60,
    exempt_paths=["/docs", "/redoc", "/openapi.json", "/api/v1/health"],
)


def _optional_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    """Return user or anonymous when no token (allows unauthenticated access)."""
    return user if user else {"sub": "anonymous"}


def require_premium(user: dict = Depends(_optional_user)) -> dict:
    """Optionally require auth; use anonymous when no token. Enforce usage limit when subscribed."""
    tenant_id = user.get("sub", "anonymous")

    # Try persistent usage tracking first, fallback to in-memory
    try:
        allowed, err = check_usage_limit_persistent(tenant_id)
        if not allowed:
            raise HTTPException(status_code=429, detail=err or "Plan limit exceeded")
        increment_usage_persistent(tenant_id)
    except Exception:
        allowed, err = check_api_usage_limit(tenant_id)
        if not allowed:
            raise HTTPException(status_code=429, detail=err or "Plan limit exceeded")
        increment_api_usage(tenant_id)

    return user


# Mount GraphQL (Strawberry)
app.include_router(GraphQLRouter(schema), prefix="/graphql")

# ---- Model Cache (pre-train once, reuse across requests) ----
_model_lock = threading.Lock()
_predictor = None
_segmentation_model = None
_scaler = None
_model_metrics: dict = {}
_cached_segmented_df = None
_models_loaded = False


def _load_models(force_reload: bool = False):
    """Load and cache ML models. Thread-safe, trains only once unless force_reload."""
    global _predictor, _segmentation_model, _scaler, _model_metrics, _cached_segmented_df, _models_loaded
    if _models_loaded and not force_reload:
        return
    with _model_lock:
        if _models_loaded and not force_reload:
            return
        df = load_customers()
        df = clean_customers(df)
        df_seg, _segmentation_model, _scaler = fit_segments(df)
        _cached_segmented_df = df_seg
        X, y, _ = encode_for_prediction(df)
        _predictor, _model_metrics = train_predictor(X, y)
        _models_loaded = True


class CustomerInput(BaseModel):
    """Input schema for spending prediction."""
    age: int
    annual_income: float
    work_experience: int
    family_size: int
    profession: Optional[str] = "Other"

    model_config = {"json_schema_extra": {
        "examples": [{"age": 35, "annual_income": 75000, "work_experience": 10, "family_size": 3, "profession": "Engineer"}]
    }}


class PredictResponse(BaseModel):
    """Response schema for spending prediction."""
    predicted_spending: float
    confidence: str

    model_config = {"json_schema_extra": {
        "examples": [{"predicted_spending": 65.3, "confidence": "medium"}]
    }}


# ---- Health Check (Advanced) ----

@app.get("/api/v1/health", tags=["system"])
def health():
    """
    Advanced health check endpoint.
    Verifies API status and optionally checks Neon DB connectivity.
    """
    result = {"status": "ok", "service": "cohortlens", "version": "0.3.0"}

    # Check Neon DB connectivity
    try:
        neon_url = os.environ.get("NEON_DATABASE_URL")
        if neon_url:
            engine = get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            result["neon_db"] = "connected"
        else:
            result["neon_db"] = "not_configured"
    except Exception as e:
        result["neon_db"] = f"error: {str(e)[:100]}"
        result["status"] = "degraded"

    # Check IPFS connectivity (optional)
    try:
        ipfs_url = os.environ.get("IPFS_API_URL")
        if ipfs_url:
            import requests as req
            resp = req.post(f"{ipfs_url.rstrip('/')}/api/v0/id", timeout=3)
            result["ipfs"] = "connected" if resp.ok else "error"
        else:
            result["ipfs"] = "not_configured"
    except Exception:
        result["ipfs"] = "unreachable"

    return result


# ---- Auth ----

class RegisterRequest(BaseModel):
    """Request schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, description="Password (min 8 chars, 1 upper, 1 lower, 1 digit)")
    tenant_id: Optional[str] = Field(None, description="Tenant ID (defaults to username)")

    model_config = {"json_schema_extra": {
        "examples": [{"username": "jdoe", "email": "jdoe@example.com", "password": "Str0ngPass", "tenant_id": "acme-corp"}]
    }}


class RefreshRequest(BaseModel):
    """Request schema for token refresh."""
    refresh_token: str


@app.post("/api/v1/auth/register", tags=["auth"], status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    """Register a new user account. Creates a tenant scoped to the user."""
    # Validate password strength
    pw_error = validate_password_strength(req.password)
    if pw_error:
        raise HTTPException(status_code=400, detail=pw_error)

    # Validate username format
    if not re.match(r'^[a-zA-Z0-9_.-]+$', req.username):
        raise HTTPException(status_code=400, detail="Username may only contain letters, digits, underscores, dots, and hyphens")

    # Check if username already exists
    existing = get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    hashed = hash_password(req.password)
    ok = create_user(
        username=req.username,
        email=req.email,
        hashed_password=hashed,
        tenant_id=req.tenant_id or req.username,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to create user. Email may already be in use.")

    # Audit log
    try:
        write_audit_log(
            table_name="users",
            record_id=req.username,
            action="INSERT",
            new_values={"username": req.username, "email": req.email, "tenant_id": req.tenant_id or req.username},
        )
    except Exception:
        pass

    # Auto-generate tokens for immediate use
    token_data = {"sub": req.username, "tenant_id": req.tenant_id or req.username}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    return {
        "message": "User registered successfully",
        "username": req.username,
        "tenant_id": req.tenant_id or req.username,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@app.post("/api/v1/token", tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint. Returns JWT access + refresh tokens."""
    from cohort_lens.api.auth import authenticate_user
    
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = {"sub": user["username"], "tenant_id": user.get("tenant_id", user["username"])}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@app.post("/api/v1/auth/refresh", tags=["auth"])
def refresh_token(req: RefreshRequest):
    """Exchange a refresh token for a new access + refresh token pair."""
    payload = verify_refresh_token(req.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    token_data = {"sub": payload["sub"], "tenant_id": payload.get("tenant_id", payload["sub"])}
    return {
        "access_token": create_access_token(data=token_data),
        "refresh_token": create_refresh_token(data=token_data),
        "token_type": "bearer",
    }


# ---- Prediction ----

@app.post("/api/v1/predict-spending", response_model=PredictResponse, tags=["prediction"])
def predict_spending(customer: CustomerInput, _user: dict = Depends(require_premium)):
    """
    Predict spending score for a customer (premium).
    Returns a predicted spending score (0-100) with confidence level.
    """
    _load_models()
    df = pd.DataFrame([{
        "Age": customer.age,
        "Annual Income ($)": customer.annual_income,
        "Work Experience": customer.work_experience,
        "Family Size": customer.family_size,
        "Profession": customer.profession or "Other",
    }])
    X, _, _ = encode_for_prediction(df)
    res = _predictor.predict(X)
    pred = float(res.iloc[0] if hasattr(res, "iloc") else res[0])
    pred = max(0, min(100, pred))

    # Persist prediction to Neon DB (best-effort)
    try:
        persist_prediction(
            customer_id=f"api_{_user.get('sub', 'unknown')}",
            predicted_spending=pred,
            features={
                "age": customer.age,
                "annual_income": customer.annual_income,
                "work_experience": customer.work_experience,
                "family_size": customer.family_size,
                "profession": customer.profession,
            },
            user_id=_user.get("sub"),
        )
    except Exception:
        pass  # Non-critical: don't fail prediction if persistence fails

    return PredictResponse(predicted_spending=round(pred, 1), confidence="medium")


# ---- Segmentation ----

@app.post("/api/v1/segment", tags=["segmentation"])
def segment_batch(customers: list[dict], _user: dict = Depends(require_premium)):
    """Segment a batch of customers. Returns cluster labels (premium)."""
    _load_models()
    cfg = get_config()
    feat_cols = cfg.get("models", {}).get("segmentation", {}).get(
        "features", ["Age", "Annual Income ($)", "Spending Score (1-100)"]
    )
    df = pd.DataFrame(customers)
    for col in feat_cols:
        if col not in df.columns:
            raise HTTPException(400, f"Missing column: {col}")
    X = df[feat_cols].values
    X_scaled = _scaler.transform(X)
    labels = _segmentation_model.predict(X_scaled)

    # Persist segments to Neon DB (best-effort)
    try:
        if "CustomerID" in df.columns:
            df_with_clusters = df.copy()
            df_with_clusters["Cluster"] = labels
            persist_segments(df_with_clusters, user_id=_user.get("sub"))
    except Exception:
        pass

    return {"clusters": labels.tolist()}


# ---- RAG Recommendations (Groq LLM) ----

class NaturalRecommendationRequest(BaseModel):
    """Request schema for natural language recommendation."""
    query: str = Field(..., max_length=500, description="Natural language query (max 500 chars)")

    model_config = {"json_schema_extra": {
        "examples": [{"query": "What are the best segments for upselling?"}]
    }}


@app.post("/api/v1/recommendations/natural", tags=["insights"])
def recommendations_natural(req: NaturalRecommendationRequest, _user: dict = Depends(require_premium)):
    """Generate natural language recommendations using RAG with Groq (or rule-based fallback if no API key) (premium)."""
    # Use cached segmented data instead of re-segmenting per request
    _load_models()
    context = generate_segment_recommendations(_cached_segmented_df)
    recommendation_text = get_natural_recommendation(req.query, context)
    return {"recommendation": recommendation_text}


# ---- SHAP Explainability ----

@app.get("/api/v1/predict-spending/explain", tags=["prediction"])
def predict_spending_explain(
    age: int,
    annual_income: float,
    work_experience: int,
    family_size: int,
    profession: str = "Other",
    _user: dict = Depends(require_premium),
):
    """Explain prediction with SHAP feature importance (premium)."""
    _load_models()
    df = pd.DataFrame([{
        "Age": age,
        "Annual Income ($)": annual_income,
        "Work Experience": work_experience,
        "Family Size": family_size,
        "Profession": profession,
    }])
    X, _, _ = encode_for_prediction(df)
    return explain_prediction(_predictor, X, sample_index=0)


@app.get("/api/v1/predict-spending/{customer_id}/explain", tags=["prediction"])
def predict_spending_explain_by_id(customer_id: str, _user: dict = Depends(require_premium)):
    """Explain prediction with SHAP for a customer by ID (premium). Loads customer from CSV or Neon."""
    _load_models()
    df = load_customers()
    df = clean_customers(df)
    cid = str(customer_id).strip()
    match = df[df["CustomerID"].astype(str) == cid]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Customer not found: {customer_id}")
    row = match.iloc[0]
    one = pd.DataFrame([{
        "Age": int(row.get("Age", 0)),
        "Annual Income ($)": float(row.get("Annual Income ($)", 0)),
        "Work Experience": int(row.get("Work Experience", 0)),
        "Family Size": int(row.get("Family Size", 1)),
        "Profession": str(row.get("Profession", "Other")),
    }])
    X, _, _ = encode_for_prediction(one)
    return explain_prediction(_predictor, X, sample_index=0)


# ---- Data Drift ----

@app.get("/api/v1/drift", tags=["monitoring"])
def data_drift_check(_user: dict = Depends(require_premium)):
    """
    Check for data drift in the current dataset versus the saved baseline.
    Returns per-feature PSI and KS test results.
    """
    df = load_customers()
    df = clean_customers(df)
    return check_drift(df)


@app.post("/api/v1/drift/save-baseline", tags=["monitoring"])
def save_drift_baseline(_user: dict = Depends(require_premium)):
    """
    Save current dataset as the drift baseline.
    Should be called after model retraining.
    """
    df = load_customers()
    df = clean_customers(df)
    baseline_path = get_project_root() / "data" / "processed" / "baseline.json"
    save_baseline(df, baseline_path)
    return {"status": "ok", "baseline_path": str(baseline_path)}


# ---- Report Generation ----

class ReportRequest(BaseModel):
    """Request schema for report generation."""
    metrics: Optional[List[str]] = None
    figures: Optional[List[str]] = None
    upload_to_ipfs: Optional[bool] = False
    format: Optional[str] = "html"

    model_config = {"json_schema_extra": {
        "examples": [{"metrics": ["mse", "r2"], "figures": ["clusters", "correlation"], "upload_to_ipfs": False, "format": "html"}]
    }}


@app.post("/api/v1/reports/generate", tags=["reports"])
def generate_report(req: ReportRequest, _user: dict = Depends(require_premium)):
    """
    Generate an executive report with selectable metrics and figures.
    Optionally uploads to IPFS and returns the CID.
    """
    df = load_customers()
    df = clean_customers(df)
    df_seg, _, _ = fit_segments(df)

    X, y, _ = encode_for_prediction(df)
    _, metrics = train_predictor(X, y)

    root = get_project_root()
    cfg = get_config()
    fig_dir = root / cfg.get("reporting", {}).get("figures_path", "reports/figures")
    report_id = uuid.uuid4().hex[:8]
    out_path = root / "reports" / f"report_{report_id}.html"

    tenant_id = _user.get("sub", "unknown")

    report_path = generate_executive_report(
        segmented_df=df_seg,
        metrics=metrics,
        figures_dir=fig_dir,
        output_path=out_path,
        metrics_selection=req.metrics,
        figures_selection=req.figures,
        upload_to_ipfs=req.upload_to_ipfs,
        tenant_id=tenant_id,
    )

    # Audit log
    try:
        write_audit_log(
            table_name="reports",
            record_id=report_id,
            action="INSERT",
            new_values={
                "format": req.format,
                "metrics": req.metrics,
                "figures": req.figures,
                "output_path": str(report_path),
            },
            user_id=tenant_id,
        )
    except Exception:
        pass

    return {
        "status": "ok",
        "report_id": report_id,
        "download_url": f"/api/v1/reports/{report_id}",
        "output_path": str(report_path),
        "format": req.format or "html",
    }


# ---- Audit Log ----

@app.get("/api/v1/audit-log", tags=["admin"])
def get_audit_log_entries(
    table_name: Optional[str] = None,
    record_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _user: dict = Depends(_optional_user),
):
    """Retrieve audit log entries with pagination (admin). Filterable by table and record ID."""
    result = get_audit_log(table_name=table_name, record_id=record_id, limit=limit, offset=offset)
    return result


# --- Web3 / Consent endpoints ---

class ConsentRequest(BaseModel):
    """Request schema for consent registration."""
    customer_id: str
    consent_type: str  # data_share, marketing, analytics
    granted: bool

    model_config = {"json_schema_extra": {
        "examples": [{"customer_id": "123", "consent_type": "data_share", "granted": True}]
    }}


@app.post("/api/v1/consent/register", tags=["consent"])
def consent_register(req: ConsentRequest):
    """Register user consent (SSI/DID flow)."""
    ok = register_consent(req.customer_id, req.consent_type, req.granted)

    # Audit log
    try:
        write_audit_log(
            table_name="user_consents",
            record_id=req.customer_id,
            action="INSERT",
            new_values={
                "consent_type": req.consent_type,
                "granted": req.granted,
            },
        )
    except Exception:
        pass

    return {"success": ok}


@app.get("/api/v1/consent/{customer_id}", tags=["consent"])
def consent_status(customer_id: str, consent_type: Optional[str] = None):
    """Get consent status for a customer."""
    statuses = get_consent_status(customer_id, consent_type)
    return {"consents": statuses}


# ---- API Usage ----

@app.get("/api/v1/usage", tags=["admin"])
def get_api_usage(_user: dict = Depends(_optional_user)):
    """Get current API usage for the authenticated tenant."""
    tenant_id = _user.get("sub", "default")
    try:
        count = get_usage_persistent(tenant_id)
        return {"tenant_id": tenant_id, "current_month_calls": count}
    except Exception:
        return {"tenant_id": tenant_id, "current_month_calls": "unavailable"}


# --- Webhooks (for integrations) ---

@app.post("/api/v1/webhooks/stripe", tags=["integrations"])
async def stripe_webhook(request: Request):
    """Stripe webhook for subscription events. Persists to Neon DB."""
    try:
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        endpoint_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        if not endpoint_secret:
            return {"received": True, "warning": "STRIPE_WEBHOOK_SECRET not set"}
        event = stripe.Webhook.construct_event(payload, sig, endpoint_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event.type == "customer.subscription.created":
        handle_stripe_subscription_event(event.data.object)
    elif event.type == "customer.subscription.updated":
        handle_stripe_subscription_event(event.data.object)
    elif event.type == "customer.subscription.deleted":
        sub = event.data.object
        sid = getattr(sub, "id", None)
        if sid:
            end_subscription_by_stripe_id(str(sid))
    elif event.type == "invoice.paid":
        # Log invoice payment
        try:
            invoice = event.data.object
            write_audit_log(
                table_name="subscriptions",
                record_id=getattr(invoice, "subscription", "unknown"),
                action="UPDATE",
                new_values={"event": "invoice.paid", "amount": getattr(invoice, "amount_paid", 0)},
            )
        except Exception:
            pass
    elif event.type == "customer.subscription.trial_will_end":
        # Log trial ending notification
        try:
            sub = event.data.object
            write_audit_log(
                table_name="subscriptions",
                record_id=getattr(sub, "id", "unknown"),
                action="UPDATE",
                new_values={"event": "trial_will_end"},
            )
        except Exception:
            pass

    return {"received": True}


# ---- CSV Upload ----

@app.post("/api/v1/data/upload", tags=["data"])
async def upload_csv(
    file: UploadFile = File(..., description="CSV file with customer data"),
    _user: dict = Depends(require_premium),
):
    """
    Upload a CSV file with customer data. Validates schema and upserts into Neon DB.
    Accepts standard CohortLens CSV format with columns:
    CustomerID, Gender, Age, Annual Income ($), Spending Score (1-100), Profession, Work Experience, Family Size
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Validate required columns
    required_cols = {"CustomerID", "Gender", "Age", "Annual Income ($)", "Spending Score (1-100)", "Profession", "Work Experience", "Family Size"}
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(sorted(missing))}")

    # Clean data
    df = clean_customers(df)
    if df.empty:
        raise HTTPException(status_code=400, detail="No valid rows after cleaning")

    # Upsert to Neon DB if configured
    upserted = 0
    try:
        from cohort_lens.data.db import upsert_customers
        upserted = upsert_customers(df)
    except Exception:
        pass  # Neon not configured — data still returned

    tenant_id = _user.get("sub", "unknown")

    # Audit log
    try:
        write_audit_log(
            table_name="customers",
            record_id=f"upload_{file.filename}",
            action="INSERT",
            new_values={"filename": file.filename, "rows": len(df), "upserted": upserted},
            user_id=tenant_id,
        )
    except Exception:
        pass

    # Invalidate model cache so next request uses new data
    global _models_loaded
    _models_loaded = False

    return {
        "status": "ok",
        "filename": file.filename,
        "rows_parsed": len(df),
        "rows_upserted": upserted,
        "columns": list(df.columns),
    }


# ---- GDPR Compliance Endpoints ----

@app.delete("/api/v1/customers/{customer_id}", tags=["gdpr"])
def delete_customer(customer_id: str, _user: dict = Depends(require_auth)):
    """
    Delete a customer record (GDPR right to erasure).
    Soft-deletes the customer by setting deleted_at timestamp.
    """
    tenant_id = _user.get("sub", _user.get("tenant_id", "unknown"))
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(
                text("UPDATE customers SET deleted_at = NOW() WHERE customer_id = :cid AND deleted_at IS NULL"),
                {"cid": str(customer_id)},
            )
            conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Customer not found: {customer_id}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete customer: {str(e)}")

    # Audit log
    try:
        write_audit_log(
            table_name="customers",
            record_id=customer_id,
            action="DELETE",
            old_values={"customer_id": customer_id},
            user_id=tenant_id,
        )
    except Exception:
        pass

    return {"status": "deleted", "customer_id": customer_id}


@app.get("/api/v1/customers/{customer_id}/export", tags=["gdpr"])
def export_customer_data(customer_id: str, _user: dict = Depends(require_auth)):
    """
    Export all data for a customer (GDPR data portability).
    Returns customer profile, segments, predictions, and consent records.
    """
    try:
        engine = get_engine()
        result: dict = {"customer_id": customer_id}

        with engine.connect() as conn:
            # Customer profile
            row = conn.execute(
                text("SELECT customer_id, gender, age, annual_income, spending_score, profession, work_experience, family_size, created_at FROM customers WHERE customer_id = :cid AND deleted_at IS NULL"),
                {"cid": str(customer_id)},
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Customer not found: {customer_id}")
            result["profile"] = {
                "customer_id": row[0], "gender": row[1], "age": row[2],
                "annual_income": float(row[3]) if row[3] else None,
                "spending_score": row[4], "profession": row[5],
                "work_experience": row[6], "family_size": row[7],
                "created_at": str(row[8]) if row[8] else None,
            }

            # Segments
            segs = conn.execute(
                text("SELECT cluster, model_version, created_at FROM segments WHERE customer_id = :cid ORDER BY created_at DESC"),
                {"cid": str(customer_id)},
            ).fetchall()
            result["segments"] = [{"cluster": s[0], "model_version": s[1], "created_at": str(s[2])} for s in segs]

            # Predictions
            preds = conn.execute(
                text("SELECT predicted_spending, model_version, features_snapshot, created_at FROM predictions WHERE customer_id = :cid ORDER BY created_at DESC"),
                {"cid": str(customer_id)},
            ).fetchall()
            result["predictions"] = [
                {"predicted_spending": float(p[0]), "model_version": p[1], "features": p[2], "created_at": str(p[3])}
                for p in preds
            ]

            # Consents
            consents = conn.execute(
                text("SELECT consent_type, granted, created_at FROM user_consents WHERE customer_id = :cid ORDER BY created_at DESC"),
                {"cid": str(customer_id)},
            ).fetchall()
            result["consents"] = [{"consent_type": c[0], "granted": c[1], "created_at": str(c[2])} for c in consents]

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export customer data: {str(e)}")


# ---- Report Download ----

@app.get("/api/v1/reports/{report_id}", tags=["reports"])
def download_report(report_id: str, _user: dict = Depends(require_premium)):
    """Download a previously generated report as HTML content."""
    root = get_project_root()
    report_path = root / "reports" / f"report_{report_id}.html"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail=f"Report not found: {report_id}")

    html_content = report_path.read_text(encoding="utf-8")
    return HTMLResponse(content=html_content, status_code=200)


# ---- Model Management ----

@app.post("/api/v1/models/retrain", tags=["admin"])
def retrain_models(_user: dict = Depends(require_auth)):
    """Force retrain all ML models with latest data. Admin only."""
    if not _user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        _load_models(force_reload=True)
        return {"status": "ok", "message": "Models retrained successfully", "metrics": _model_metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")


# ---- Customer List with Pagination ----

@app.get("/api/v1/customers", tags=["data"])
def list_customers(
    page: int = 1,
    page_size: int = 50,
    _user: dict = Depends(require_premium),
):
    """List customers with pagination. Returns paginated customer records."""
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 200:
        page_size = 50

    offset = (page - 1) * page_size
    try:
        engine = get_engine()
        with engine.connect() as conn:
            # Get total count
            total_row = conn.execute(text("SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL")).fetchone()
            total = total_row[0] if total_row else 0

            # Get paginated results
            rows = conn.execute(
                text(
                    "SELECT customer_id, gender, age, annual_income, spending_score, "
                    "profession, work_experience, family_size, created_at "
                    "FROM customers WHERE deleted_at IS NULL "
                    "ORDER BY customer_id LIMIT :limit OFFSET :offset"
                ),
                {"limit": page_size, "offset": offset},
            ).fetchall()

        customers = [
            {
                "customer_id": r[0], "gender": r[1], "age": r[2],
                "annual_income": float(r[3]) if r[3] else None,
                "spending_score": r[4], "profession": r[5],
                "work_experience": r[6], "family_size": r[7],
                "created_at": str(r[8]) if r[8] else None,
            }
            for r in rows
        ]

        return {
            "customers": customers,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list customers: {str(e)}")
