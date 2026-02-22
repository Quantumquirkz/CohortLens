"""Reusable plotting functions for CohortLens."""
from pathlib import Path
from typing import Optional, List

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
import numpy as np

from cohort_lens.utils.config_reader import get_config


def _save_or_show(ax: plt.Axes, save_path: Optional[Path] = None, dpi: int = 150):
    fig = ax.get_figure()
    if save_path:
        fig.savefig(save_path, dpi=dpi, bbox_inches="tight")
        plt.close(fig)
    else:
        plt.show()


def plot_gender_distribution(
    df: pd.DataFrame,
    save_path: Optional[Path] = None,
    ax: Optional[plt.Axes] = None,
) -> plt.Axes:
    """Plot gender distribution as pie chart."""
    if ax is None:
        fig, ax = plt.subplots(figsize=(8, 6))
    gender = df["Gender"].value_counts().reset_index()
    gender.columns = ["Gender", "Count"]
    colors = ["pink", "skyblue"]
    ax.pie(gender["Count"], labels=gender["Gender"], autopct="%1.1f%%", startangle=90, colors=colors)
    ax.set_title("Gender Distribution")
    if save_path:
        fig = ax.get_figure()
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return ax


def plot_numerical_histograms(
    df: pd.DataFrame,
    columns: Optional[List[str]] = None,
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Plot histograms for numerical columns."""
    cfg = get_config()
    cols = columns or cfg.get("features", {}).get("numerical", [])
    cols = [c for c in cols if c in df.columns]
    if not cols:
        cols = df.select_dtypes(include=["number"]).columns.tolist()
    n = len(cols)
    ncols = min(3, n)
    nrows = (n + ncols - 1) // ncols
    sns.set_style("whitegrid")
    fig, axes = plt.subplots(nrows, ncols, figsize=(5 * ncols, 4 * nrows))
    if n == 1:
        axes = np.array([[axes]])
    elif nrows == 1:
        axes = axes.reshape(1, -1)
    for i, col in enumerate(cols):
        r, c = i // ncols, i % ncols
        sns.histplot(df[col], bins=20, kde=True, ax=axes[r, c])
        axes[r, c].set_title(f"Distribution of {col}")
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig


def plot_categorical_counts(
    df: pd.DataFrame,
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Plot count plots for Gender and Profession."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 6))
    if "Gender" in df.columns:
        sns.countplot(x="Gender", data=df, ax=axes[0])
        axes[0].set_title("Customer Count by Gender")
    if "Profession" in df.columns:
        sns.countplot(y="Profession", data=df, ax=axes[1])
        axes[1].set_title("Customer Count by Profession")
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig


def plot_elbow_curve(
    X: np.ndarray,
    k_range: tuple = (1, 11),
    random_state: int = 42,
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Plot elbow curve for KMeans."""
    from sklearn.cluster import KMeans
    wcss = []
    for k in range(k_range[0], k_range[1]):
        km = KMeans(n_clusters=k, max_iter=50, random_state=random_state)
        km.fit(X)
        wcss.append(km.inertia_)
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(range(k_range[0], k_range[1]), wcss)
    ax.set_title("Elbow Method for Optimal K")
    ax.set_xlabel("Number of Clusters")
    ax.set_ylabel("WCSS")
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig


def plot_clusters(
    df: pd.DataFrame,
    x_col: str = "Annual Income ($)",
    y_col: str = "Spending Score (1-100)",
    cluster_col: str = "Cluster",
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Scatter plot of clusters."""
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.scatter(df[x_col], df[y_col], c=df[cluster_col], cmap="tab20")
    ax.set_title("Customer Segmentation")
    ax.set_xlabel(x_col)
    ax.set_ylabel(y_col)
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig


def plot_prediction_vs_actual(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Scatter plot of predicted vs actual spending."""
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.scatter(y_true, y_pred, color="blue", alpha=0.6)
    ax.set_title("Predicted vs Actual Spending Score")
    ax.set_xlabel("Actual Spending Score")
    ax.set_ylabel("Predicted Spending Score")
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig


def plot_correlation_heatmap(
    corr: pd.DataFrame,
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Plot correlation heatmap."""
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f", ax=ax)
    ax.set_title("Correlation Matrix")
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig


def plot_savings(
    df: pd.DataFrame,
    id_col: str = "CustomerID",
    savings_col: str = "Savings Percent",
    save_path: Optional[Path] = None,
) -> plt.Figure:
    """Bar chart of savings percentage by customer (first 50 for readability)."""
    subset = df.head(50)
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar(subset[id_col].astype(str), subset[savings_col], color="skyblue")
    ax.set_xlabel(id_col)
    ax.set_ylabel(savings_col)
    ax.set_title("Savings Percent by Customer (first 50)")
    plt.xticks(rotation=45)
    plt.tight_layout()
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
    return fig
