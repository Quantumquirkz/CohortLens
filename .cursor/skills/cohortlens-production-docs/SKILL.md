# CohortLens — Production documentation site

Maintain the **Docusaurus** documentation project at the repository root in [`docs/`](../../docs/).

## Stack

- **Docusaurus 3** (classic preset): search, versioning-ready structure, MDX.
- **Alternative**: Nextra (Next.js) — use only if the team standardizes on it; default for this repo is Docusaurus.

## Layout

| Path | Purpose |
|------|---------|
| `docs/docs/` | User-facing Markdown/MDX pages (intro, architecture, deployment, API, security). |
| `docs/static/` | Static assets; `openapi.json` synced from FastAPI when available. |
| `docs/scripts/` | Automation: OpenAPI sync, optional contract doc export. |

## FastAPI OpenAPI

1. Run the backend locally: `uvicorn app.main:app` from `packages/backend-ai` (or Docker).
2. Run `node docs/scripts/sync-openapi.mjs` (or `bash docs/scripts/sync-openapi.sh`) to fetch `http://127.0.0.1:8000/openapi.json` into `docs/static/openapi.json`.
3. In Docusaurus, the **API** page embeds or links to Redoc/Swagger using that JSON (see `docs/docs/api.md`).

CI can run sync in a job that starts the app briefly or uploads a committed `openapi.json`.

## Solidity contracts (NatSpec)

- Prefer **`forge doc`** from `packages/contracts` to generate Markdown under `docs/docs/contracts/` (copy or script the output), or use **solidity-docgen** as a follow-up enhancement.
- Keep NatSpec on public/external functions in `packages/contracts/src/`.

## Python docstrings

- For public modules (`app/routers`, `app/schemas`), use Google-style docstrings; optional export via a small script using **griffe** (or `mkdocstrings` if you add a Python docs toolchain).

## Conventions

- Link to deployment addresses in `packages/contracts/deployments/`.
- Link to [RELEASE.md](../../RELEASE.md) for versioning.
- Do not duplicate secrets; reference [SECURITY.md](../../SECURITY.md) for reporting vulnerabilities.
