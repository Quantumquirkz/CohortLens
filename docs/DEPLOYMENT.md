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
| API_HOST | API bind host | 127.0.0.1 |
| API_PORT | API port | 8000 |
| LOG_LEVEL | Logging level | INFO |

## Cloud Deployment

For AWS/Azure/GCP, use the Docker image and deploy as a container service. Ensure the `data/` volume is mounted or use object storage for datasets. Configure environment variables in the platform's secret manager.
