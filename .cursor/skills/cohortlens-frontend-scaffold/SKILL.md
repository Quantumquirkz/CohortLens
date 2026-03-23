---
name: cohortlens-frontend-scaffold
description: Scaffold the CohortLens Next.js 14 App Router frontend with Tailwind, Wagmi, Viem, React Query, and axios. Use when creating or resetting packages/frontend structure.
---

# CohortLens frontend scaffold

## When to use

- Initializing or regenerating `packages/frontend` with the standard layout: `app/`, `components/ui`, `components/cohort`, `components/layout`, `hooks`, `lib`, `styles`, `types`.
- Ensuring config files exist: `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `package.json`.

## Dependencies (package.json)

Core: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/node`, `@types/react`, `@types/react-dom`.

Web3 / data: `wagmi`, `viem`, `@tanstack/react-query`, `axios`.

## Folder structure

```
packages/frontend/
  app/
    layout.tsx
    page.tsx
    providers.tsx
    error.tsx
    global-error.tsx
    dashboard/page.tsx
  components/
    layout/AppHeader.tsx
    ui/WalletButton.tsx
    cohort/CohortTable.tsx
  hooks/
    useWallet.ts
    useCohortApi.ts
  lib/
    api.ts
    wagmi-config.ts
  styles/globals.css
  types/cohort.ts
```

## Providers

- Single client `app/providers.tsx`: `QueryClientProvider` wrapping `WagmiProvider` (wagmi config from `lib/wagmi-config.ts`).
- Root `app/layout.tsx` imports `styles/globals.css` and wraps children with `Providers` + shared header.

## Verification

```bash
cd packages/frontend && npm install && npm run dev
```

Ensure backend is on port 8000 for `/dashboard` API calls.
