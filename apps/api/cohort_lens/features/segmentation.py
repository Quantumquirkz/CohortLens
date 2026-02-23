"""Customer segmentation with KMeans and silhouette-based k selection."""
from typing import Tuple, Optional

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

from cohort_lens.utils.config_reader import get_config
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def fit_segments(
    df: pd.DataFrame,
    n_clusters: Optional[int] = None,
    random_state: Optional[int] = None,
    algorithm: Optional[str] = None,
) -> Tuple[pd.DataFrame, object, StandardScaler]:
    """Fit segmentation model and return df with Cluster column, model, scaler."""
    cfg = get_config()
    seg_cfg = cfg.get("models", {}).get("segmentation", {})
    seed = random_state if random_state is not None else cfg.get("models", {}).get("random_seed", 42)
    feat_cols = seg_cfg.get("features", ["Age", "Annual Income ($)", "Spending Score (1-100)"])
    algo = algorithm or seg_cfg.get("algorithm", "kmeans")
    k_range = seg_cfg.get("silhouette_range", [2, 11])

    X = df[feat_cols].copy()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    if algo == "kmeans":
        if n_clusters is None:
            n_clusters = _optimal_k_silhouette(X_scaled, k_range, seed)
        model = KMeans(
            n_clusters=n_clusters,
            init="k-means++",
            n_init=seg_cfg.get("n_init", 10),
            max_iter=seg_cfg.get("max_iter", 300),
            random_state=seed,
        )
        labels = model.fit_predict(X_scaled)
    elif algo == "gmm":
        if n_clusters is None:
            n_clusters = _optimal_k_silhouette(X_scaled, k_range, seed)
        model = GaussianMixture(n_components=n_clusters, random_state=seed)
        labels = model.fit_predict(X_scaled)
    elif algo == "dbscan":
        model = DBSCAN(eps=0.5, min_samples=5)
        labels = model.fit_predict(X_scaled)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    else:
        raise ValueError(f"Unknown algorithm: {algo}")

    df_out = df.copy()
    df_out["Cluster"] = labels

    sil = silhouette_score(X_scaled, labels) if n_clusters > 1 else 0
    logger.info("Segmentation: %s, k=%s, silhouette=%.3f", algo, n_clusters, sil)

    return df_out, model, scaler


def _optimal_k_silhouette(X, k_range, seed):
    best_k, best_score = 2, -1
    for k in range(k_range[0], min(k_range[1], len(X) // 2 + 1)):
        km = KMeans(n_clusters=k, random_state=seed, n_init=10)
        labels = km.fit_predict(X)
        if len(set(labels)) < 2:
            continue
        score = silhouette_score(X, labels)
        if score > best_score:
            best_score, best_k = score, k
    return best_k


def interpret_segments(df: pd.DataFrame) -> dict:
    """Return per-cluster profiles."""
    if "Cluster" not in df.columns:
        return {}
    profiles = {}
    for c in sorted(df["Cluster"].unique()):
        sub = df[df["Cluster"] == c]
        profiles[int(c)] = {
            "count": len(sub),
            "mean_age": sub["Age"].mean(),
            "mean_income": sub["Annual Income ($)"].mean(),
            "mean_spending": sub["Spending Score (1-100)"].mean(),
            "profession_dist": sub["Profession"].value_counts().to_dict() if "Profession" in sub.columns else {},
        }
    return profiles
