"""
CohortLens API – entry point for FastAPI (Vercel serverless or standalone).

Usage:
  From apps/api/:  uvicorn main:app --host 0.0.0.0 --port 8000
  Or via CLI:      cohortlens serve --host 0.0.0.0 --port 8000
"""
from cohort_lens.api.rest_api import app
