"""K-Means clustering for cohort discovery."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.cluster import KMeans

from app.schemas.cohort import Cohort, CohortRequest, CohortResponse, UserProfile

FEATURE_KEYS = ("tx_count", "volume", "avg_gas")


def perform_clustering(
    request: CohortRequest,
    users: list[dict[str, Any]],
) -> CohortResponse:
    """Run K-Means clustering on user features and return cohort assignments."""
    for f in request.features:
        if f not in FEATURE_KEYS:
            raise ValueError(f"Unknown feature '{f}'; supported: {FEATURE_KEYS}")

    if not users:
        return CohortResponse(cohorts=[], total_users=0)

    n_samples = len(users)
    n_clusters = min(request.num_clusters, n_samples)
    n_clusters = max(1, n_clusters)

    X = np.array([[float(u[f]) for f in request.features] for u in users])

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)
    centers = kmeans.cluster_centers_

    clusters: dict[int, list[dict[str, Any]]] = {i: [] for i in range(n_clusters)}
    for label, user in zip(labels, users, strict=False):
        clusters[label].append(user)

    cohort_list = []
    for i in range(n_clusters):
        center_dict = {feat: float(centers[i][j]) for j, feat in enumerate(request.features)}
        user_profiles = [
            UserProfile(
                address=u["address"],
                features={f: float(u[f]) for f in request.features},
            )
            for u in clusters[i]
        ]
        cohort = Cohort(
            id=i,
            size=len(clusters[i]),
            center=center_dict,
            users=user_profiles,
        )
        cohort_list.append(cohort)

    return CohortResponse(cohorts=cohort_list, total_users=len(users))
