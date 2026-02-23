"""Executive report generation for CohortLens."""
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from jinja2 import Template

from cohort_lens.utils.config_reader import get_config, get_project_root


def _filter_metrics(metrics: Dict[str, Any], selected: Optional[List[str]] = None) -> Dict[str, Any]:
    """Filter metrics by selected keys."""
    if not selected:
        return metrics
    return {k: v for k, v in metrics.items() if k in selected}


def _filter_figures(figures: Dict[str, str], selected: Optional[List[str]] = None) -> Dict[str, str]:
    """Filter figures by selected names."""
    if not selected:
        return figures
    return {k: v for k, v in figures.items() if k in selected}


REPORT_HTML = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CohortLens - Executive Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 24px; }
    table { border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    .metric { display: inline-block; margin: 8px 16px 8px 0; padding: 12px; background: #f0f8ff; border-radius: 4px; }
    img { max-width: 100%; height: auto; margin: 12px 0; }
    .segment { margin: 16px 0; padding: 12px; background: #fafafa; border-left: 4px solid #4a90d9; }
    .recommendation { background: #e8f5e9; padding: 8px 12px; margin: 8px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>CohortLens - Executive Report</h1>
  <p>Generated report with segment profiles and recommendations.</p>

  <h2>Prediction Metrics</h2>
  <div>
    <span class="metric">MSE: {{ metrics.get('mse', 0) | round(2) }}</span>
    <span class="metric">MAE: {{ metrics.get('mae', 0) | round(2) }}</span>
    <span class="metric">R2: {{ metrics.get('r2', 0) | round(3) }}</span>
  </div>

  <h2>Segment Profiles</h2>
  {% for cluster_id, profile in profiles.items() %}
  <div class="segment">
    <h3>Segment {{ cluster_id }}</h3>
    <ul>
      <li>Count: {{ profile.count }}</li>
      <li>Mean Age: {{ profile.mean_age | round(1) }}</li>
      <li>Mean Income: ${{ profile.mean_income | round(0) }}</li>
      <li>Mean Spending Score: {{ profile.mean_spending | round(1) }}</li>
    </ul>
    {% if recommendations and cluster_id in recommendations %}
    <div class="recommendation">{{ recommendations[cluster_id].action }}</div>
    {% endif %}
  </div>
  {% endfor %}

  <h2>Figures</h2>
  {% for name, path in figures.items() %}
  <h3>{{ name }}</h3>
  <img src="{{ path }}" alt="{{ name }}" style="max-width: 600px;" />
  {% endfor %}
</body>
</html>
"""


def generate_executive_report(
    segmented_df,
    metrics: Dict[str, Any],
    figures_dir: Path | None = None,
    output_path: Path | None = None,
    recommendations: Dict | None = None,
    metrics_selection: Optional[List[str]] = None,
    figures_selection: Optional[List[str]] = None,
    upload_to_ipfs: Optional[bool] = None,
    tenant_id: Optional[str] = None,
) -> Path:
    """Generate HTML executive report. Optionally upload to IPFS and store CID in Neon."""
    from cohort_lens.features.segmentation import interpret_segments
    from cohort_lens.insights.recommender import generate_segment_recommendations

    profiles = interpret_segments(segmented_df)
    recs = recommendations or generate_segment_recommendations(segmented_df)

    root = get_project_root()
    cfg = get_config()
    rep_cfg = cfg.get("reporting", {})
    out_dir = root / rep_cfg.get("save_path", "reports")
    fig_dir = figures_dir or root / rep_cfg.get("figures_path", "reports/figures")
    out_path = output_path or out_dir / "executive_report.html"

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig_dir = Path(fig_dir)
    fig_dir.mkdir(parents=True, exist_ok=True)

    figures = {}
    for f in fig_dir.glob("*.png"):
        figures[f.stem] = str(f.name)

    rep_cfg = cfg.get("reporting", {})
    metrics_sel = metrics_selection or rep_cfg.get("metrics", list(metrics.keys()))
    figures_sel = figures_selection or rep_cfg.get("figures", list(figures.keys()))
    metrics = _filter_metrics(metrics, metrics_sel)
    figures = _filter_figures(figures, figures_sel)

    tpl = Template(REPORT_HTML)
    html = tpl.render(
        metrics=metrics,
        profiles=profiles,
        recommendations=recs,
        figures=figures,
    )
    out_path.write_text(html, encoding="utf-8")

    do_ipfs = upload_to_ipfs if upload_to_ipfs is not None else os.environ.get("REPORT_UPLOAD_IPFS", "").lower() in ("1", "true", "yes")
    if do_ipfs:
        from cohort_lens.web3.ipfs_client import upload_to_ipfs as ipfs_upload, store_ipfs_artifact
        content = out_path.read_bytes()
        cid = ipfs_upload(content, filename=out_path.name)
        if cid:
            store_ipfs_artifact(
                cid,
                artifact_type="report",
                metadata={
                    "tenant_id": tenant_id,
                    "generated_at": datetime.utcnow().isoformat(),
                    "output_path": str(out_path),
                },
            )

    return out_path
