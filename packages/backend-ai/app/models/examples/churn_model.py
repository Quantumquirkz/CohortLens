"""Ejemplo: clasificador de churn con datos sintéticos."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier


def build_synthetic_data(
    n_samples: int = 500,
    n_features: int = 8,
    random_state: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(random_state)
    x = rng.standard_normal((n_samples, n_features))
    score = x[:, :3].sum(axis=1)
    y = (score > 0).astype(np.int64)
    return x, y


def train_churn_classifier(
    n_samples: int = 500,
    n_features: int = 8,
    random_state: int = 42,
) -> RandomForestClassifier:
    x, y = build_synthetic_data(n_samples, n_features, random_state)
    clf = RandomForestClassifier(
        n_estimators=50,
        max_depth=6,
        random_state=random_state,
    )
    clf.fit(x, y)
    return clf
