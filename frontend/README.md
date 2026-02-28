# CohortLens Frontend

> Legacy client during migration. New feature development moves to `apps/mobile` (Expo React Native).

Next.js dashboard for the CohortLens API (predict, segment, recommendations, drift, reports, audit).

## Prerequisites

- Node 18+
- Backend API running (e.g. `cohortlens serve --host 0.0.0.0 --port 8000`)

## Install and run

**With npm:**

```bash
cd frontend
npm install
npm run dev
```

**With pnpm** (if installed):

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` if not authenticated. Default backend user: `admin` / `admin` (see backend `.env`).

## Environment

Optional: create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If unset, the app uses `http://localhost:8000` as the API base URL.
