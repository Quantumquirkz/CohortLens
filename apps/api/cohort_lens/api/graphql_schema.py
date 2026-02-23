"""Strawberry GraphQL schema for CohortLens with auth protection."""

import uuid
from typing import Optional

import pandas as pd
import strawberry
from strawberry.types import Info

from cohort_lens.api.auth import verify_token
from cohort_lens.data import load_customers, clean_customers, encode_for_prediction
from cohort_lens.data.audit import write_audit_log
from cohort_lens.data.drift import check_drift
from cohort_lens.features import fit_segments, train_predictor
from cohort_lens.features.segmentation import interpret_segments
from cohort_lens.utils.config_reader import get_project_root, get_config
from cohort_lens.visualization.reports import generate_executive_report
from cohort_lens.web3.consent import register_consent, get_consent_status


# ---- Auth helpers for GraphQL ----

def _get_user_from_context(info: Info) -> Optional[dict]:
    """Extract authenticated user from Strawberry context (FastAPI request)."""
    try:
        request = info.context.get("request") or info.context.get("req")
        if request is None:
            return None
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ", 1)[1]
        return verify_token(token)
    except Exception:
        return None


def _require_auth(info: Info) -> dict:
    """Require authentication for a GraphQL operation. Raises if not authenticated."""
    user = _get_user_from_context(info)
    if user is None:
        raise Exception("Authentication required. Provide a valid Bearer token.")
    return user


# ---- Types ----

@strawberry.type
class Customer:
    """Customer type for GraphQL."""

    customer_id: str
    gender: Optional[str]
    age: Optional[int]
    annual_income: float
    spending_score: Optional[int]
    profession: Optional[str]
    work_experience: Optional[int]
    family_size: Optional[int]


@strawberry.type
class PredictionResult:
    """Prediction result type."""

    predicted_spending: float
    confidence: str


@strawberry.type
class SegmentResult:
    """Segment batch result."""

    clusters: list[int]


@strawberry.type
class SegmentProfile:
    """Per-cluster profile information."""

    cluster_id: int
    count: int
    mean_age: float
    mean_income: float
    mean_spending: float


@strawberry.type
class ConsentEntry:
    """Consent status entry."""

    consent_type: str
    granted: bool
    created_at: Optional[str]


@strawberry.type
class DriftFeatureReport:
    """Drift report for a single feature."""

    feature_name: str
    psi: float
    ks_statistic: float
    ks_p_value: float
    drift_detected: bool
    current_mean: float
    baseline_mean: float


@strawberry.type
class DriftReport:
    """Overall drift report."""

    drift_detected: bool
    num_features_checked: int
    num_features_drifted: int
    features: list[DriftFeatureReport]


@strawberry.type
class ReportResult:
    """Result of report generation."""

    status: str
    report_id: str
    output_path: str


# ---- Inputs ----

@strawberry.input
class CustomerInput:
    """Input for prediction."""

    age: int
    annual_income: float
    work_experience: int
    family_size: int
    profession: Optional[str] = "Other"


@strawberry.input
class ConsentInput:
    """Input for consent registration."""

    customer_id: str
    consent_type: str
    granted: bool


# ---- Queries ----

@strawberry.type
class Query:
    """GraphQL queries."""

    @strawberry.field
    def health(self) -> str:
        """Health check."""
        return "ok"

    @strawberry.field
    def customers(self, info: Info, limit: int = 50) -> list[Customer]:
        """List customers (first N). Requires authentication."""
        _require_auth(info)
        df = load_customers()
        df = clean_customers(df)
        df = df.head(limit)
        return [
            Customer(
                customer_id=str(row["CustomerID"]),
                gender=str(row.get("Gender", "")),
                age=int(row.get("Age", 0)),
                annual_income=float(row.get("Annual Income ($)", 0)),
                spending_score=int(row.get("Spending Score (1-100)", 0)),
                profession=str(row.get("Profession", "")),
                work_experience=int(row.get("Work Experience", 0)),
                family_size=int(row.get("Family Size", 1)),
            )
            for _, row in df.iterrows()
        ]

    @strawberry.field
    def customer_by_id(self, info: Info, customer_id: str) -> Optional[Customer]:
        """Get a single customer by ID. Requires authentication."""
        _require_auth(info)
        df = load_customers()
        df = clean_customers(df)
        match = df[df["CustomerID"].astype(str) == customer_id.strip()]
        if match.empty:
            return None
        row = match.iloc[0]
        return Customer(
            customer_id=str(row["CustomerID"]),
            gender=str(row.get("Gender", "")),
            age=int(row.get("Age", 0)),
            annual_income=float(row.get("Annual Income ($)", 0)),
            spending_score=int(row.get("Spending Score (1-100)", 0)),
            profession=str(row.get("Profession", "")),
            work_experience=int(row.get("Work Experience", 0)),
            family_size=int(row.get("Family Size", 1)),
        )

    @strawberry.field
    def segment_profiles(self, info: Info) -> list[SegmentProfile]:
        """Get segment profiles. Requires authentication."""
        _require_auth(info)
        df = load_customers()
        df = clean_customers(df)
        df_seg, _, _ = fit_segments(df)
        profiles = interpret_segments(df_seg)

        return [
            SegmentProfile(
                cluster_id=int(cluster_id),
                count=p["count"],
                mean_age=round(p["mean_age"], 1),
                mean_income=round(p["mean_income"], 0),
                mean_spending=round(p["mean_spending"], 1),
            )
            for cluster_id, p in profiles.items()
        ]

    @strawberry.field
    def consent_status(
        self, info: Info, customer_id: str, consent_type: Optional[str] = None
    ) -> list[ConsentEntry]:
        """Get consent status for a customer. Requires authentication."""
        _require_auth(info)
        statuses = get_consent_status(customer_id, consent_type)
        return [
            ConsentEntry(
                consent_type=s["consent_type"],
                granted=s["granted"],
                created_at=s.get("created_at"),
            )
            for s in statuses
        ]

    @strawberry.field
    def data_drift(self, info: Info) -> DriftReport:
        """Check data drift against baseline. Requires authentication."""
        _require_auth(info)
        df = load_customers()
        df = clean_customers(df)
        result = check_drift(df)

        features = []
        for name, data in result.get("features", {}).items():
            features.append(
                DriftFeatureReport(
                    feature_name=name,
                    psi=data.get("psi", 0.0),
                    ks_statistic=data.get("ks_statistic", 0.0),
                    ks_p_value=data.get("ks_p_value", 1.0),
                    drift_detected=data.get("drift_detected", False),
                    current_mean=data.get("current_mean", 0.0),
                    baseline_mean=data.get("baseline_mean", 0.0),
                )
            )

        return DriftReport(
            drift_detected=result.get("drift_detected", False),
            num_features_checked=result.get("num_features_checked", 0),
            num_features_drifted=result.get("num_features_drifted", 0),
            features=features,
        )


# ---- Mutations ----

@strawberry.type
class Mutation:
    """GraphQL mutations."""

    @strawberry.mutation
    def predict_spending(self, info: Info, customer: CustomerInput) -> PredictionResult:
        """Predict spending for a customer. Requires authentication."""
        _require_auth(info)
        from cohort_lens.api import rest_api
        rest_api._load_models()
        pred = rest_api._predictor

        df = pd.DataFrame([{
            "Age": customer.age,
            "Annual Income ($)": customer.annual_income,
            "Work Experience": customer.work_experience,
            "Family Size": customer.family_size,
            "Profession": customer.profession or "Other",
        }])
        X, _, _ = encode_for_prediction(df)
        p = float(pred.predict(X)[0])
        p = max(0, min(100, p))
        return PredictionResult(predicted_spending=round(p, 1), confidence="medium")

    @strawberry.mutation
    def register_consent(self, info: Info, consent: ConsentInput) -> bool:
        """Register user consent. Requires authentication."""
        _require_auth(info)
        ok = register_consent(consent.customer_id, consent.consent_type, consent.granted)

        # Audit log
        try:
            write_audit_log(
                table_name="user_consents",
                record_id=consent.customer_id,
                action="INSERT",
                new_values={
                    "consent_type": consent.consent_type,
                    "granted": consent.granted,
                },
            )
        except Exception:
            pass

        return ok

    @strawberry.mutation
    def generate_report(
        self,
        info: Info,
        metrics: Optional[list[str]] = None,
        figures: Optional[list[str]] = None,
        upload_to_ipfs: bool = False,
    ) -> ReportResult:
        """Generate executive report. Requires authentication."""
        user = _require_auth(info)
        df = load_customers()
        df = clean_customers(df)
        df_seg, _, _ = fit_segments(df)

        X, y, _ = encode_for_prediction(df)
        _, pred_metrics = train_predictor(X, y)

        root = get_project_root()
        cfg = get_config()
        fig_dir = root / cfg.get("reporting", {}).get("figures_path", "reports/figures")
        report_id = uuid.uuid4().hex[:8]
        out_path = root / "reports" / f"report_{report_id}.html"

        tenant_id = user.get("sub", "unknown")

        report_path = generate_executive_report(
            segmented_df=df_seg,
            metrics=pred_metrics,
            figures_dir=fig_dir,
            output_path=out_path,
            metrics_selection=metrics,
            figures_selection=figures,
            upload_to_ipfs=upload_to_ipfs,
            tenant_id=tenant_id,
        )

        return ReportResult(
            status="ok",
            report_id=report_id,
            output_path=str(report_path),
        )


schema = strawberry.Schema(query=Query, mutation=Mutation)
