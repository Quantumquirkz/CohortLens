"""Gradio lab: browse lenses and call prediction API (optional internal API key)."""

from __future__ import annotations

import os

import gradio as gr
import httpx

BACKEND_URL = os.environ.get("BACKEND_API_URL", "http://localhost:8000").rstrip("/")
INTERNAL_KEY = os.environ.get("GRADIO_INTERNAL_API_KEY", "").strip()


def _headers() -> dict[str, str]:
    h: dict[str, str] = {}
    if INTERNAL_KEY:
        h["X-Internal-Key"] = INTERNAL_KEY
    return h


def fetch_models() -> str:
    try:
        r = httpx.get(f"{BACKEND_URL}/api/v1/models", headers=_headers(), timeout=30.0)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return f"Error listing models: {e}"
    if not data:
        return "No models registered."
    lines = []
    for m in data:
        lines.append(
            f"id={m.get('id')} | {m.get('name')} | active={m.get('active')} | format={m.get('model_format')}"
        )
    return "\n".join(lines)


def predict(model_id: int, features_csv: str) -> str:
    try:
        parts = [float(x.strip()) for x in features_csv.split(",") if x.strip()]
    except ValueError as e:
        return f"Invalid features (comma-separated floats): {e}"
    if not parts:
        return "Enter at least one feature value."
    payload = {"features": parts}
    try:
        r = httpx.post(
            f"{BACKEND_URL}/api/v1/models/{int(model_id)}/predict",
            json=payload,
            headers=_headers(),
            timeout=120.0,
        )
        r.raise_for_status()
        return str(r.json())
    except Exception as e:
        return f"Prediction error: {e}"


with gr.Blocks(title="CohortLens Lab") as demo:
    gr.Markdown("# CohortLens ML Lab")
    gr.Markdown(
        "Lists models from the backend API and runs synchronous predictions. "
        "Set `BACKEND_API_URL` and optionally `GRADIO_INTERNAL_API_KEY` in Docker Compose."
    )
    out_list = gr.Textbox(label="Models", lines=12)
    btn_refresh = gr.Button("Refresh models")
    btn_refresh.click(fetch_models, outputs=out_list)
    demo.load(fetch_models, outputs=out_list)

    mid = gr.Number(label="Lens / model id", value=1, precision=0)
    feats = gr.Textbox(label="Features (comma-separated floats)", placeholder="0.1, 0.2, 0.3")
    out_pred = gr.Textbox(label="Result", lines=8)
    btn_pred = gr.Button("Predict")
    btn_pred.click(predict, inputs=[mid, feats], outputs=out_pred)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
