# Deployment on Akash Network

Celery workers can run on [Akash](https://akash.network/) using the same Docker image as the backend (`packages/backend-ai/Dockerfile`).

## Requirements

- Akash CLI (`akash`) and a wallet with **AKT** and a client certificate.
- **Redis** and optionally **Postgres** and **IPFS** reachable from the Akash network (managed services, tunnel, or co-located deployment). The Celery broker must be reachable from Akash pods.

## Steps

1. Build and push the image (example):

   ```bash
   docker build -t ghcr.io/your-org/cohortlens-backend-ai:latest packages/backend-ai
   docker push ghcr.io/your-org/cohortlens-backend-ai:latest
   ```

2. Edit [`deploy.yaml`](deploy.yaml): image, `CELERY_BROKER_URL`, `DATABASE_URL`, `IPFS_API_URL`, keys, and contracts.

3. Run the script (from the monorepo root):

   ```bash
   bash scripts/deploy_akash.sh deploy/akash/deploy.yaml
   ```

4. After `create`, send the manifest to the provider and verify lease status with `akash query` / the explorer.

## Limitations

- Without reachable Redis, workers cannot consume queues.
- Prometheus API metrics do not run in the worker; only in the FastAPI service if you deploy it separately.
