# CohortLens — Frontend

**Next.js 14** (App Router) app with **TypeScript**, **Tailwind CSS**, **Wagmi** + **Viem**, **TanStack React Query**, and **Axios** for cohort discovery via the FastAPI backend.

## Requirements

- Node.js 18+
- CohortLens backend running (default `http://localhost:8000`) to exercise the dashboard

## Install

```bash
cd packages/frontend
npm install
```

## Environment variables

Create `.env.local` in this directory (or set variables in your orchestrator):

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_API_URL` | API base URL. Default: `http://localhost:8000`. The client calls `{NEXT_PUBLIC_API_URL}/api/v1/cohorts/discover`. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | (Optional, later phases) Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com) if you add the WalletConnect connector. |

Example:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page shows the hero; the top bar has navigation and **Connect Wallet** (Wagmi). The `/dashboard` route submits the form to the cohort discovery endpoint.

## Layout

- `app/` — App Router routes, `layout.tsx`, `providers.tsx` (Wagmi + React Query), error boundaries
- `components/ui/` — atoms (e.g. `WalletButton`)
- `components/cohort/` — domain UI (`CohortTable`, marketplace)
- `components/layout/` — shared header (`AppHeader`)
- `hooks/` — `useWallet`, `useCohortApi` (React Query mutation + Axios)
- `lib/` — Wagmi config and API URL
- `types/` — DTOs aligned with the backend
- `styles/globals.css` — Tailwind entry

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (`output: "standalone"` for Docker)
- `npm run start` — serve the build (`next start`)
- `npm run lint` — ESLint (may need local setup if `next lint` asks to initialize)

## Docker

From the monorepo root:

```bash
docker compose up --build frontend
```

The image uses Next.js `standalone` output and listens on port **3000**. Set `NEXT_PUBLIC_API_URL` if the backend is not reachable at `http://localhost:8000` from the browser (e.g. public URL or Docker service name).

## Project conventions

Cursor rules at the repo root (`.cursorrules`) describe the stack, atomic component design, and folder conventions under `packages/frontend`.
