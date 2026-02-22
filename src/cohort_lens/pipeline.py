"""Main pipeline: load, clean, segment, predict, analyze, report."""
from pathlib import Path
from typing import Optional

from cohort_lens.utils.config_reader import load_config, get_config, get_project_root
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def run_pipeline(
    data_path: Optional[str | Path] = None,
    output_path: Optional[str | Path] = None,
) -> None:
    """Run full analytics pipeline."""
    load_config()
    root = get_project_root()
    cfg = get_config()
    rep_cfg = cfg.get("reporting", {})
    fig_dir = root / rep_cfg.get("figures_path", "reports/figures")
    fig_dir.mkdir(parents=True, exist_ok=True)

    from cohort_lens.data import load_customers, clean_customers, encode_for_prediction
    from cohort_lens.features import fit_segments, train_predictor
    from cohort_lens.insights import (
        compute_savings_metrics,
        generate_segment_recommendations,
        compute_correlation_matrix,
    )
    from cohort_lens.visualization.plots import (
        plot_clusters,
        plot_prediction_vs_actual,
        plot_correlation_heatmap,
        plot_savings,
    )
    from cohort_lens.visualization.reports import generate_executive_report

    path = Path(data_path) if data_path else None
    df = load_customers(path)
    df = clean_customers(df)

    df_seg, _, _ = fit_segments(df)
    plot_clusters(df_seg, save_path=fig_dir / "segmentation.png")

    X, y, _ = encode_for_prediction(df)
    predictor, metrics = train_predictor(X, y)
    y_pred = predictor.predict(X)
    plot_prediction_vs_actual(y.values, y_pred, save_path=fig_dir / "prediction.png")

    corr = compute_correlation_matrix(df)
    plot_correlation_heatmap(corr, save_path=fig_dir / "correlation.png")

    df_savings = compute_savings_metrics(df_seg)
    plot_savings(df_savings, save_path=fig_dir / "savings.png")

    out = Path(output_path) if output_path else root / rep_cfg.get("save_path", "reports") / "executive_report.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    generate_executive_report(df_seg, metrics, figures_dir=fig_dir, output_path=out)
    logger.info("Pipeline complete. Report: %s", out)
