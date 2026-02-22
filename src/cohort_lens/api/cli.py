"""Click-based CLI for CohortLens."""
from pathlib import Path
import click
from cohort_lens.utils.config_reader import load_config

@click.group()
@click.option("--config", type=click.Path(exists=True), default=None)
def cli(config):
    if config:
        load_config(config)

@cli.command()
@click.option("--data-path", type=click.Path(exists=True), default=None)
@click.option("--output", type=click.Path(), default=None)
def run(data_path, output):
    from cohort_lens.pipeline import run_pipeline
    run_pipeline(data_path=data_path, output_path=output)

@cli.command()
@click.option("--data-path", type=click.Path(exists=True), default=None)
def segment(data_path):
    from cohort_lens.data import load_customers, clean_customers
    from cohort_lens.features import fit_segments
    load_config()
    path = Path(data_path) if data_path else None
    df = load_customers(path)
    df = clean_customers(df)
    df_seg, _, _ = fit_segments(df)
    click.echo(f"Segmentation complete. {len(df_seg['Cluster'].unique())} clusters.")
    click.echo(df_seg[["CustomerID", "Cluster"]].head(20).to_string())

@cli.command()
@click.option("--data-path", type=click.Path(exists=True), default=None)
def predict(data_path):
    from cohort_lens.data import load_customers, clean_customers, encode_for_prediction
    from cohort_lens.features import train_predictor
    load_config()
    path = Path(data_path) if data_path else None
    df = load_customers(path)
    df = clean_customers(df)
    X, y, _ = encode_for_prediction(df)
    model, metrics = train_predictor(X, y)
    click.echo(f"MSE: {metrics['mse']:.2f}, MAE: {metrics['mae']:.2f}, R2: {metrics['r2']:.3f}")

@cli.command()
@click.option("--output", type=click.Path(), default=None)
def report(output):
    from cohort_lens.data import load_customers, clean_customers
    from cohort_lens.features import fit_segments
    from cohort_lens.insights.recommender import generate_segment_recommendations
    from cohort_lens.visualization.reports import generate_executive_report
    load_config()
    df = load_customers()
    df = clean_customers(df)
    df_seg, _, _ = fit_segments(df)
    recs = generate_segment_recommendations(df_seg)
    out = Path(output) if output else None
    path = generate_executive_report(df_seg, {}, recommendations=recs, output_path=out)
    click.echo(f"Report saved to {path}")

@cli.command()
@click.option("--host", default="127.0.0.1")
@click.option("--port", type=int, default=8000)
def serve(host, port):
    import uvicorn
    from cohort_lens.api.rest_api import app
    uvicorn.run(app, host=host, port=port)

def main():
    cli(obj={})
