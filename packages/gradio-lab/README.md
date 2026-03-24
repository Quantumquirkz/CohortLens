# CohortLens Gradio Lab

Small Gradio UI that lists models from the FastAPI backend and runs synchronous predictions.

## Environment

| Variable | Description |
| -------- | ----------- |
| `BACKEND_API_URL` | Base URL of `backend-ai` (e.g. `http://backend-ai:8000` in Compose). |
| `GRADIO_INTERNAL_API_KEY` | Optional; sent as `X-Internal-Key` when calling predict (use with `REQUIRE_WALLET_AUTH=true` on the API). |

## Run (Docker)

From the monorepo root:

```bash
docker compose --profile labs up --build gradio-lab
```

The service listens on port **7860** by default.

## Run (local)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
BACKEND_API_URL=http://localhost:8000 .venv/bin/python app.py
```
