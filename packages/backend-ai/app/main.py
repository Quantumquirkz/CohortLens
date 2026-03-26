"""CohortLens AI Backend — FastAPI application."""

import logging
from contextlib import asynccontextmanager
from typing import cast

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.limiter import limiter
from app.middleware.metrics import setup_prometheus
from app.routers import auth, cohorts, graphql_api, huggingface, models, predictions


def _configure_logging() -> None:
    level_name = settings.LOG_LEVEL.upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(level=level)


def _init_sentry() -> None:
    dsn = settings.SENTRY_DSN.strip()
    if not dsn:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=0.1,
    )


_configure_logging()
_init_sentry()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="CohortLens AI Backend", version="0.3.0", lifespan=lifespan)

app.state.limiter = limiter


def _rate_limit_exceeded_handler_wrapper(request: Request, exc: Exception) -> Response:
    """
    Wrapper to satisfy strict typing in Basedpyright/Pyright.

    FastAPI registers the handler for `RateLimitExceeded`, but the handler protocol
    is typed to accept `Exception`. We delegate to slowapi and cast safely.
    """

    return _rate_limit_exceeded_handler(request, cast(RateLimitExceeded, exc))


app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler_wrapper)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_prometheus(app)

app.include_router(cohorts.router, prefix="/api/v1/cohorts", tags=["cohorts"])
app.include_router(models.router, prefix="/api/v1/models", tags=["models"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(huggingface.router, prefix="/api/v1/hf", tags=["huggingface"])
app.include_router(graphql_api.router, tags=["graphql"])


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
