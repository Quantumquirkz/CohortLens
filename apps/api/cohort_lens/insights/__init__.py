"""Insights: analyzer and recommender for CohortLens."""
from cohort_lens.insights.analyzer import compute_descriptive_stats, compute_correlation_matrix
from cohort_lens.insights.recommender import compute_savings_metrics, generate_segment_recommendations

__all__ = [
    "compute_descriptive_stats",
    "compute_correlation_matrix",
    "compute_savings_metrics",
    "generate_segment_recommendations",
]
