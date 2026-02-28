# CohortLens — Deployment

## Docker (API)

```bash
# Build and run from repo root
docker build -f deployment/Dockerfile.api -t cohortlens-api .
docker run -p 8001:8001 \
  -e NEON_DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  cohortlens-api
```

## Docker Compose

```bash
# Create .env with required variables
cat > .env <<EOF
NEON_DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
GROQ_API_KEY=gsk_...
EOF

docker compose -f deployment/docker-compose.yml up -d
```

## Vercel (API — serverless)

The NestJS app can be deployed to Vercel using the `@vercel/node` adapter. Add a `vercel.json` to `apps/api-ts/`:

```json
{
  "version": 2,
  "builds": [{ "src": "dist/src/main.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/src/main.js" }]
}
```

## Expo (Mobile — EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
cd apps/mobile
eas build:configure

# Build for iOS/Android
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Web deploy (static export)
pnpm --filter @cohortlens/mobile web
# Then deploy the dist/ folder to any static host (Vercel, Netlify, etc.)
```

## Environment variables

See `apps/api-ts/.env.example` for the full list.

Required in production:
- `NEON_DATABASE_URL` — PostgreSQL connection string from Neon
- `JWT_SECRET` — Random string, min 32 characters

Optional:
- `GROQ_API_KEY` — Enables AI recommendations via Groq LLM
