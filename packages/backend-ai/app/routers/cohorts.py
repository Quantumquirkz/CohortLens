"""Cohort discovery API endpoints."""

from __future__ import annotations

import asyncio
from functools import partial

import httpx
import redis
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.clustering import perform_clustering
from app.schemas.cohort import CohortRequest, CohortResponse
from app.services.blockchain_client import (
    build_fulfillment_bytes,
    build_prediction_input_bytes,
    get_oracle_contract,
    get_web3,
    is_oracle_ready,
    request_prediction,
)
from app.services.graph_client import GraphClientError, fetch_user_metrics_for_block_range

router = APIRouter()


@router.post("/discover", response_model=CohortResponse)
async def discover_cohorts(request: CohortRequest) -> CohortResponse:
    """Discover user cohorts via K-Means clustering on subgraph-backed features."""
    try:
        users = await fetch_user_metrics_for_block_range(
            request.start_block,
            request.end_block,
            request.protocol,
        )
    except GraphClientError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Error HTTP al consultar subgraph: {e}") from e

    loop = asyncio.get_running_loop()
    try:
        response = await loop.run_in_executor(
            None,
            partial(perform_clustering, request, users),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    if not is_oracle_ready(settings):
        return response

    try:
        w3 = get_web3(settings.SEPOLIA_RPC_URL)
        contract = get_oracle_contract(w3, settings.COHORT_ORACLE_ADDRESS)
        input_b = build_prediction_input_bytes(response)
        fulfill_b = build_fulfillment_bytes(response)
        req_id, tx_hex = request_prediction(
            w3,
            contract,
            settings.ORACLE_REQUESTER_PRIVATE_KEY,
            settings.COHORT_LENS_ID,
            input_b,
        )
        r = redis.from_url(settings.REDIS_URL)
        r.setex(
            f"oracle:pending:{req_id}",
            settings.ORACLE_PENDING_TTL_SECONDS,
            fulfill_b,
        )
        return response.model_copy(
            update={
                "oracle_request_id": req_id,
                "oracle_tx_hash": tx_hex,
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo registrar la petición en el oracle: {e}",
        ) from e
