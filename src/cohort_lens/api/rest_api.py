"""FastAPI REST API for CohortLens."""
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from cohort_lens.api.auth import require_auth

app = FastAPI(title="CohortLens API", version="0.1.0")


def require_premium(user: dict = Depends(require_auth)) -> dict:
    """Require auth and enforce subscription API usage limit (max_api_calls_per_month)."""
    from cohort_lens.api.subscriptions import increment_api_usage, check_api_usage_limit
    tenant_id = user.get("sub", "default")
    allowed, err = check_api_usage_limit(tenant_id)
    if not allowed:
        raise HTTPException(status_code=429, detail=err or "Plan limit exceeded")
    increment_api_usage(tenant_id)
    return user

# Mount GraphQL (Strawberry)
from strawberry.fastapi import GraphQLRouter
from cohort_lens.api.graphql_schema import schema

app.include_router(GraphQLRouter(schema), prefix="/graphql")

# Lazy-loaded models (loaded on first request)
_predictor = None
_segmentation_model = None
_scaler = None


def _load_models():
    global _predictor, _segmentation_model, _scaler
    if _predictor is not None:
        return
    from cohort_lens.data import load_customers, clean_customers, encode_for_prediction
    from cohort_lens.features import fit_segments, train_predictor
    df = load_customers()
    df = clean_customers(df)
    df_seg, _segmentation_model, _scaler = fit_segments(df)
    X, y, _ = encode_for_prediction(df)
    _predictor, _ = train_predictor(X, y)


class CustomerInput(BaseModel):
    age: int
    annual_income: float
    work_experience: int
    family_size: int
    profession: Optional[str] = "Other"


class PredictResponse(BaseModel):
    predicted_spending: float
    confidence: str


@app.get("/api/v1/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "cohortlens"}


@app.post("/api/v1/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 compatible token endpoint. Returns JWT for valid credentials."""
    from cohort_lens.api.auth import (
        create_access_token,
        verify_password,
        get_default_user_hash,
    )
    # Default dev user (change in production via env)
    default_user = os.environ.get("DEFAULT_AUTH_USER", "admin")
    if form_data.username != default_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(form_data.password, get_default_user_hash()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/api/v1/predict-spending", response_model=PredictResponse)
def predict_spending(customer: CustomerInput, _user: dict = Depends(require_premium)):
    """Predict spending score for a customer (premium)."""
    from cohort_lens.data import encode_for_prediction
    import pandas as pd
    from cohort_lens.utils.config_reader import get_config

    _load_models()
    cfg = get_config()
    pred_cfg = cfg.get("models", {}).get("prediction", {})
    feat_cfg = pred_cfg.get("features", {})
    cat_cols = feat_cfg.get("categorical", ["Profession"])
    num_cols = feat_cfg.get("numerical", ["Annual Income ($)", "Age", "Work Experience", "Family Size"])
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
    return PredictResponse(predicted_spending=round(pred, 1), confidence="medium")


@app.post("/api/v1/segment")
def segment_batch(customers: list[dict], _user: dict = Depends(require_premium)):
    """Segment a batch of customers. Returns cluster labels (premium)."""
    _load_models()
    import pandas as pd
    from cohort_lens.utils.config_reader import get_config
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
    return {"clusters": labels.tolist()}


class NaturalRecommendationRequest(BaseModel):
    query: str


@app.post("/api/v1/recommendations/natural")
def recommendations_natural(req: NaturalRecommendationRequest, _user: dict = Depends(require_premium)):
    """Generate natural language recommendations using RAG (or rule-based fallback) (premium)."""
    from cohort_lens.insights.rag import get_natural_recommendation
    from cohort_lens.insights.recommender import generate_segment_recommendations
    from cohort_lens.data import load_customers, clean_customers
    from cohort_lens.features import fit_segments

    df = load_customers()
    df = clean_customers(df)
    df_seg, _, _ = fit_segments(df)
    context = generate_segment_recommendations(df_seg)
    text = get_natural_recommendation(req.query, context)
    return {"recommendation": text}


@app.get("/api/v1/predict-spending/explain")
def predict_spending_explain(
    age: int,
    annual_income: float,
    work_experience: int,
    family_size: int,
    profession: str = "Other",
    _user: dict = Depends(require_premium),
):
    """Explain prediction with SHAP feature importance (premium)."""
    from cohort_lens.data import encode_for_prediction
    from cohort_lens.features.prediction import explain_prediction
    import pandas as pd

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


@app.get("/api/v1/predict-spending/{customer_id}/explain")
def predict_spending_explain_by_id(customer_id: str, _user: dict = Depends(require_premium)):
    """Explain prediction with SHAP for a customer by ID (premium). Loads customer from CSV or Neon."""
    from cohort_lens.data import load_customers, clean_customers, encode_for_prediction
    from cohort_lens.features.prediction import explain_prediction
    import pandas as pd

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


# --- Web3 / Consent endpoints ---

class ConsentRequest(BaseModel):
    customer_id: str
    consent_type: str  # data_share, marketing, analytics
    granted: bool


@app.post("/api/v1/consent/register")
def consent_register(req: ConsentRequest):
    """Register user consent (SSI/DID flow)."""
    from cohort_lens.web3.consent import register_consent

    ok = register_consent(req.customer_id, req.consent_type, req.granted)
    return {"success": ok}


@app.get("/api/v1/consent/{customer_id}")
def consent_status(customer_id: str, consent_type: Optional[str] = None):
    """Get consent status for a customer."""
    from cohort_lens.web3.consent import get_consent_status

    statuses = get_consent_status(customer_id, consent_type)
    return {"consents": statuses}


# --- Webhooks (for integrations) ---

@app.post("/api/v1/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook for subscription events. Persists to Neon DB."""
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        endpoint_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        if not endpoint_secret:
            return {"received": True, "warning": "STRIPE_WEBHOOK_SECRET not set"}
        event = stripe.Webhook.construct_event(payload, sig, endpoint_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    from cohort_lens.api.subscriptions import (
        handle_stripe_subscription_event,
        end_subscription_by_stripe_id,
    )

    if event.type == "customer.subscription.created":
        handle_stripe_subscription_event(event.data.object)
    elif event.type == "customer.subscription.updated":
        handle_stripe_subscription_event(event.data.object)
    elif event.type == "customer.subscription.deleted":
        sub = event.data.object
        sid = getattr(sub, "id", None)
        if sid:
            end_subscription_by_stripe_id(str(sid))

    return {"received": True}
