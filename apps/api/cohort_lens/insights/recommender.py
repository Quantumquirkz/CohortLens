"""Savings metrics and segment-level recommendations."""
import pandas as pd

from cohort_lens.features.segmentation import interpret_segments


def compute_savings_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Compute monthly income, estimated spend, and savings percentage."""
    out = df.copy()
    out["Monthly Income"] = out["Annual Income ($)"] / 12
    out["Estimated Monthly Spend"] = (
        out["Work Experience"] * 1000 + out["Family Size"] * 500
    )
    out["Savings Percent"] = (
        (out["Monthly Income"] - out["Estimated Monthly Spend"]) / out["Monthly Income"]
    ) * 100
    return out


def generate_segment_recommendations(segmented_df: pd.DataFrame) -> dict:
    """Generate text recommendations per cluster."""
    profiles = interpret_segments(segmented_df)
    recs = {}
    for cluster_id, p in profiles.items():
        age = p["mean_age"]
        inc = p["mean_income"]
        spend = p["mean_spending"]
        n = p["count"]
        if spend > 60:
            action = "High spender: prioritize loyalty programs and premium offers."
        elif inc > segmented_df["Annual Income ($)"].median():
            action = "High income: upsell premium products and services."
        else:
            action = "Budget-conscious: focus on value propositions and promotions."
        recs[cluster_id] = {
            "action": action,
            "count": n,
            "mean_spending": spend,
            "mean_income": inc,
            "mean_age": age,
        }
    return recs
