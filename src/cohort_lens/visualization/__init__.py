"""Visualization for CRM Navigator Pro."""
from cohort_lens.visualization.plots import (
    plot_gender_distribution,
    plot_numerical_histograms,
    plot_categorical_counts,
    plot_elbow_curve,
    plot_clusters,
    plot_prediction_vs_actual,
    plot_correlation_heatmap,
    plot_savings,
)
from cohort_lens.visualization.reports import generate_executive_report

__all__ = [
    "plot_gender_distribution",
    "plot_numerical_histograms",
    "plot_categorical_counts",
    "plot_elbow_curve",
    "plot_clusters",
    "plot_prediction_vs_actual",
    "plot_correlation_heatmap",
    "plot_savings",
    "generate_executive_report",
]
