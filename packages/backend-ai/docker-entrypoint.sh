#!/bin/sh
set -e
# Run migrations only for the API process (not Celery workers/beat).
if echo "${DATABASE_URL:-}" | grep -q '^postgresql' && echo "$*" | grep -q uvicorn; then
  alembic upgrade head
fi
exec "$@"
