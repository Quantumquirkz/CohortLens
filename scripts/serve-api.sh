#!/usr/bin/env bash
# Run CohortLens API server using a virtual environment (avoids system Python / PEP 668).
set -e
cd "$(dirname "$0")/.."
VENV_DIR="${VENV_DIR:-.venv}"
API_DIR="apps/api"

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating virtual environment at $VENV_DIR ..."
  python3 -m venv "$VENV_DIR"
fi
echo "Using virtual environment: $VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "Installing API dependencies ..."
pip install -q -e "$API_DIR"

echo "Starting API server (host=${HOST:-0.0.0.0} port=${PORT:-8000}) ..."
exec cohortlens serve --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"
