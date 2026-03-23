# CohortLens — Frontend

**Next.js** (Pages Router) app with **TypeScript**, **Tailwind CSS**, and **Wagmi** + **Viem** for wallet support.

## Requirements

- Node.js 18+

## Local development

```bash
cd packages/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local` in this directory (or use the monorepo root depending on your flow):

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | (Optional, later phases) Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com). |

## Docker

From the monorepo root:

```bash
docker compose up --build frontend
```

The image uses Next.js `standalone` output and listens on port **3000**.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the build (`next start`)
