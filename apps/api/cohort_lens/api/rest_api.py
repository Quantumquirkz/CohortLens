"""FastAPI REST API for CohortLens."""
import os
import uuid
from pathlib import Path
from typing import Optional, List

import pandas as pd
import stripe
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import text
from strawberry.fastapi import GraphQLRouter

from cohort_lens.api.auth import (
    require_auth,
    create_access_token,
    verify_password,
    get_default_user_hash,
)
from cohort_lens.api.graphql_schema import schema
from cohort_lens.api.rate_limit import RateLimitMiddleware
from cohort_lens.api.subscriptions import (
    increment_api_usage,
    check_api_usage_limit,
    handle_stripe_subscription_event,
    end_subscription_by_stripe_id,
    get_subscription,
    PLAN_LIMITS,
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
from cohort_lens.features import fit_segments, train_predictor
from cohort_lens.features.prediction import explain_prediction
from cohort_lens.insights.rag import get_natural_recommendation
from cohort_lens.insights.recommender import generate_segment_recommendations
from cohort_lens.utils.config_reader import get_project_root, get_config
from cohort_lens.web3.consent import register_consent, get_consent_status
from cohort_lens.visualization.reports import generate_executive_report

app = FastAPI(
    title="CohortLens API",
    version="0.2.0",
    description="CRM analytics platform for customer segmentation, spending prediction, and actionable insights.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---- Rate Limiting Middleware ----
app.add_middleware(
    RateLimitMiddleware,
    max_requests=int(os.environ.get("RATE_LIMIT_PER_MINUTE", "60")),
    window_seconds=60,
    exempt_paths=["/docs", "/redoc", "/openapi.json", "/api/v1/health"],
)


def require_premium(user: dict = Depends(require_auth)) -> dict:
    """Require auth and enforce subscription API usage limit (max_api_calls_per_month)."""
    tenant_id = user.get("sub", "default")

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

# Lazy-loaded models (loaded on first request)
_predictor = None
_segmentation_model = None
_scaler = None


def _load_models():
    global _predictor, _segmentation_model, _scaler
    if _predictor is not None:
        return
    df = load_customers()
    df = clean_customers(df)
    df_seg, _segmentation_model, _scaler = fit_segments(df)
    X, y, _ = encode_for_prediction(df)
    _predictor, _ = train_predictor(X, y)


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
    result = {"status": "ok", "service": "cohortlens", "version": "0.2.0"}

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

@app.post("/api/v1/token", tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint. Returns JWT for valid credentials."""
    from cohort_lens.api.auth import authenticate_user
    
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "tenant_id": user.get("tenant_id", user["username"])}
    )
    return {"access_token": access_token, "token_type": "bearer"}


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
    query: str

    model_config = {"json_schema_extra": {
        "examples": [{"query": "What are the best segments for upselling?"}]
    }}


@app.post("/api/v1/recommendations/natural", tags=["insights"])
def recommendations_natural(req: NaturalRecommendationRequest, _user: dict = Depends(require_premium)):
    """Generate natural language recommendations using RAG with Groq (or rule-based fallback if no API key) (premium)."""
    df = load_customers()
    df = clean_customers(df)
    df_seg, _, _ = fit_segments(df)
    context = generate_segment_recommendations(df_seg)
    text = get_natural_recommendation(req.query, context)
    return {"recommendation": text}


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
        "output_path": str(report_path),
        "format": req.format or "html",
    }


# ---- Audit Log ----

@app.get("/api/v1/audit-log", tags=["admin"])
def get_audit_log_entries(
    table_name: Optional[str] = None,
    record_id: Optional[str] = None,
    limit: int = 50,
    _user: dict = Depends(require_auth),
):
    """Retrieve audit log entries (admin). Filterable by table and record ID."""
    entries = get_audit_log(table_name=table_name, record_id=record_id, limit=limit)
    return {"entries": entries, "count": len(entries)}


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
def get_api_usage(_user: dict = Depends(require_auth)):
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
