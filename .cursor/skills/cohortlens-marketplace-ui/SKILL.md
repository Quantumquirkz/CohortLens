---
name: cohortlens-marketplace-ui
description: Next.js App Router UI for the decentralized model marketplace — list and detail pages, Wagmi, React Query.
---

# CohortLens — Marketplace (frontend)

## Routes (App Router)

- [`app/marketplace/page.tsx`](../../../packages/frontend/app/marketplace/page.tsx) — list `GET /api/v1/models`.
- [`app/models/[id]/page.tsx`](../../../packages/frontend/app/models/[id]/page.tsx) — detail and prediction form.

Do not use `pages/` except legacy migration; see [`.cursorrules`](../../../.cursorrules).

## API

- Base: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
- Types in `types/model.ts`; hooks in `hooks/useModelsApi.ts`.
- Navigation: link in `AppHeader` to `/marketplace`.

## UX flow

1. Marketplace shows name, owner, price (wei), CID.
2. "Use model" navigates to `/models/{id}`.
3. User enters a feature vector (JSON) and optionally connects a wallet to sign if the backend requires auth.
