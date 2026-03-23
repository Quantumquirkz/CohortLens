---
name: cohortlens-marketplace-ui
description: Next.js App Router UI for the decentralized model marketplace — list and detail pages, Wagmi, React Query.
---

# CohortLens — Marketplace (frontend)

## Rutas (App Router)

- [`app/marketplace/page.tsx`](../../../packages/frontend/app/marketplace/page.tsx) — lista `GET /api/v1/models`.
- [`app/models/[id]/page.tsx`](../../../packages/frontend/app/models/[id]/page.tsx) — detalle y formulario de predicción.

No uses `pages/` salvo migración legacy; ver [`.cursorrules`](../../../.cursorrules).

## API

- Base: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
- Tipos en `types/model.ts`; hooks en `hooks/useModelsApi.ts`.
- Navegación: enlace en `AppHeader` a `/marketplace`.

## Flujo UX

1. Marketplace muestra nombre, propietario, precio (wei), CID.
2. "Usar modelo" navega a `/models/{id}`.
3. Usuario introduce vector de características (JSON) y opcionalmente conecta wallet para firmar si el backend exige auth.
