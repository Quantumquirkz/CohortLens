#!/usr/bin/env bash
# Run Alembic migrations against DATABASE_URL from the environment.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/packages/backend-ai"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

alembic upgrade head
