"""Streamlit dashboard for CohortLens. Run from repo root: streamlit run scripts/dashboard.py
Requires: pip install -e apps/api (or PYTHONPATH=apps/api)."""
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
_api = _root / "apps" / "api"
if _api.exists() and str(_api) not in sys.path:
    sys.path.insert(0, str(_api))

import streamlit as st

from cohort_lens.data import load_customers, clean_customers
from cohort_lens.features import fit_segments, train_predictor
from cohort_lens.data import encode_for_prediction
from cohort_lens.insights import compute_savings_metrics, compute_correlation_matrix
from cohort_lens.visualization.plots import (
    plot_gender_distribution,
    plot_clusters,
    plot_clusters_plotly,
    plot_correlation_heatmap,
    plot_correlation_heatmap_plotly,
    plot_savings,
)

st.set_page_config(page_title="CohortLens", layout="wide")
st.title("CohortLens Dashboard")

try:
    df = load_customers()
    df = clean_customers(df)
except FileNotFoundError as e:
    st.error(f"Dataset not found. Place Customers.csv in data/raw/. Error: {e}")
    st.stop()

tabs = st.tabs(["Data Overview", "Segmentation", "Predictions", "Recommendations"])

with tabs[0]:
    st.subheader("Data Overview")
    st.dataframe(df.head(50))
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(6, 6))
    plot_gender_distribution(df, ax=ax)
    st.pyplot(fig)
    corr = compute_correlation_matrix(df)
    st.subheader("Correlation Matrix")
    fig_plotly = plot_correlation_heatmap_plotly(corr)
    if fig_plotly:
        st.plotly_chart(fig_plotly, use_container_width=True)
    else:
        fig2 = plot_correlation_heatmap(corr)
        if fig2:
            st.pyplot(fig2)

with tabs[1]:
    st.subheader("Customer Segmentation")
    df_seg, _, _ = fit_segments(df)
    st.dataframe(df_seg[["CustomerID", "Cluster", "Age", "Annual Income ($)", "Spending Score (1-100)"]].head(50))
    fig_plotly = plot_clusters_plotly(df_seg)
    if fig_plotly:
        st.plotly_chart(fig_plotly, use_container_width=True)
    else:
        fig = plot_clusters(df_seg)
        if fig:
            st.pyplot(fig)

with tabs[2]:
    st.subheader("Spending Prediction")
    X, y, _ = encode_for_prediction(df)
    model, metrics = train_predictor(X, y)
    st.metric("MSE", f"{metrics['mse']:.2f}")
    st.metric("R2", f"{metrics['r2']:.3f}")

with tabs[3]:
    st.subheader("Savings Recommendations")
    df_savings = compute_savings_metrics(df)
    st.dataframe(df_savings[["CustomerID", "Monthly Income", "Estimated Monthly Spend", "Savings Percent"]].head(50))
    fig = plot_savings(df_savings)
    if fig:
        st.pyplot(fig)
