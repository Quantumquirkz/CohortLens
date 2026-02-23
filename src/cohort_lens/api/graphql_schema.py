"""Strawberry GraphQL schema for CohortLens."""

from typing import Optional

import strawberry


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
class Query:
    """GraphQL queries."""

    @strawberry.field
    def health(self) -> str:
        """Health check."""
        return "ok"

    @strawberry.field
    def customers(self, limit: int = 50) -> list[Customer]:
        """List customers (first N)."""
        from cohort_lens.data import load_customers, clean_customers

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


@strawberry.input
class CustomerInput:
    """Input for prediction."""

    age: int
    annual_income: float
    work_experience: int
    family_size: int
    profession: Optional[str] = "Other"


@strawberry.type
class Mutation:
    """GraphQL mutations."""

    @strawberry.mutation
    def predict_spending(self, customer: CustomerInput) -> PredictionResult:
        """Predict spending for a customer."""
        from cohort_lens.data import encode_for_prediction
        import pandas as pd

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


schema = strawberry.Schema(query=Query, mutation=Mutation)
