"""FastAPI REST API for CohortLens."""
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="CohortLens API", version="0.1.0")

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


@app.post("/api/v1/predict-spending", response_model=PredictResponse)
def predict_spending(customer: CustomerInput):
    """Predict spending score for a customer."""
    _load_models()
    import pandas as pd
    from cohort_lens.utils.config_reader import get_config
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
    X, _, encoder = encode_for_prediction(df)
    pred = float(_predictor.predict(X)[0])
    pred = max(0, min(100, pred))
    return PredictResponse(predicted_spending=round(pred, 1), confidence="medium")


@app.post("/api/v1/segment")
def segment_batch(customers: list[dict]):
    """Segment a batch of customers. Returns cluster labels."""
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
