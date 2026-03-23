---
sidebar_position: 4
---

# API reference

The backend exposes OpenAPI metadata at `/openapi.json` when running.

## Sync OpenAPI into the docs site

1. Start the API locally (`packages/backend-ai`):

   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

2. From `docs/`:

   ```bash
   npm run sync-openapi
   ```

This writes `static/openapi.json`. You can browse the same schema with Swagger UI at `http://127.0.0.1:8000/docs` while developing.

## Embedded spec

The generated file is served as a static asset at `/openapi.json` after `npm run build`. Use external tools (Redoc, Postman) or the interactive **Swagger** UI on the running server for exploration.

Main route groups (see FastAPI app): `/api/v1/cohorts`, `/api/v1/models`, `/api/v1/predictions`, `/api/v1/auth`.
