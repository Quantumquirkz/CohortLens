"""K-Means clustering for cohort discovery.

Uses mock user data for now; will be replaced with blockchain data in later phases.
"""

import random
from typing import Any

import numpy as np
from sklearn.cluster import KMeans

from app.schemas.cohort import Cohort, CohortRequest, CohortResponse, UserProfile

# Features supported by mock generator.
MOCK_FEATURES = ("tx_count", "volume", "avg_gas")


def generate_mock_users(n_users: int = 200) -> list[dict[str, Any]]:
    """Generate mock users with random features for testing.

    In later phases this will be replaced by blockchain/subgraph data.
    """
    random.seed(42)
    users = []
    for i in range(n_users):
        users.append({
            "address": f"0x{i:040x}",
            "tx_count": random.randint(1, 1000),
            "volume": random.uniform(0.1, 10000),
            "avg_gas": random.uniform(10, 500),
        })
    return users


def perform_clustering(request: CohortRequest) -> CohortResponse:
    """Run K-Means clustering on user features and return cohort assignments."""
    mock_users = generate_mock_users(200)

    # Ensure requested features exist in mock data.
    for f in request.features:
        if f not in MOCK_FEATURES:
            raise ValueError(f"Unknown feature '{f}'; supported: {MOCK_FEATURES}")

    # Clamp num_clusters to valid range for sklearn.
    n_samples = len(mock_users)
    n_clusters = min(request.num_clusters, n_samples)
    n_clusters = max(1, n_clusters)

    X = np.array([[u[f] for f in request.features] for u in mock_users])

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)
    centers = kmeans.cluster_centers_

    clusters: dict[int, list[dict[str, Any]]] = {i: [] for i in range(n_clusters)}
    for label, user in zip(labels, mock_users):
        clusters[label].append(user)

    cohort_list = []
    for i in range(n_clusters):
        center_dict = {feat: float(centers[i][j]) for j, feat in enumerate(request.features)}
        user_profiles = [
            UserProfile(
                address=u["address"],
                features={f: u[f] for f in request.features},
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

    return CohortResponse(cohorts=cohort_list, total_users=len(mock_users))
