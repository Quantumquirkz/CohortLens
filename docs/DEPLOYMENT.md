# CohortLens - Deployment

## Docker

Build and run the API:

```bash
cd CodeCrafters-United
docker-compose -f deployment/docker-compose.yml up --build
```

The API will be available at http://localhost:8000.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATA_RAW_PATH | Path to raw data directory | data/raw |
| DATA_PROCESSED_PATH | Path to processed data | data/processed |
| DATA_SOURCE | csv \| neon | csv |
| NEON_DATABASE_URL | Neon DB connection URL | (required when DATA_SOURCE=neon) |
| API_HOST | API bind host | 127.0.0.1 |
| API_PORT | API port | 8000 |
| LOG_LEVEL | Logging level | INFO |
| JWT_SECRET | JWT signing secret (change in production) | cohortlens-dev-secret |
| JWT_EXPIRE_MINUTES | JWT token validity in minutes | 60 |
| DEFAULT_AUTH_USER | Default login username | admin |
| DEFAULT_USER_PASSWORD | Default login password (hash generated at runtime) | admin |
| OPENAI_API_KEY | OpenAI API key for RAG recommendations | (optional) |
| ANTHROPIC_API_KEY | Anthropic API key (alternative to OpenAI for RAG) | (optional) |
| STRIPE_SECRET_KEY | Stripe API key for webhooks | (optional) |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret | (optional) |
| IPFS_API_URL | IPFS node or Pinata/Infura API URL | http://127.0.0.1:5001 |
| REPORT_UPLOAD_IPFS | Set to 1/true/yes to upload reports to IPFS after generation | (optional) |

## Migrate CSV to Neon DB

```bash
export NEON_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
python scripts/migrate_csv_to_neon.py [path/to/Customers.csv]
```

## Cloud Deployment (without AWS)

Use **Neon DB** for PostgreSQL. Deploy API to **Railway**, **Render**, or **Fly.io**. Set `NEON_DATABASE_URL` and `DATA_SOURCE=neon` in the platform's environment variables.
