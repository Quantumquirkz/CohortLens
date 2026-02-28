# CohortLens Web (Next.js 14+)

> Legacy scaffold. No new feature work. The migration target client is `apps/mobile`.

Frontend for the CohortLens platform. **Frontend implementation is done separately;** this folder keeps the agreed structure for Vercel and the monorepo.

## Structure

- `app/` – App Router (Next.js 14+)
  - `(auth)/login`, `(auth)/signup`
  - `(dashboard)/` – layout, page, segments, predictions, reports, settings
  - `api/` – route handlers (auth, segments, …)
  - `layout.tsx`, `page.tsx`
- `components/ui`, `components/charts`, `components/layout`
- `lib/`, `public/`

## Commands

```bash
pnpm install
pnpm dev
pnpm build
```

From the monorepo root: `pnpm --filter @cohortlens/web dev`
