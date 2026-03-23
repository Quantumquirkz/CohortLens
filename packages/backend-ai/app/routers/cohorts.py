"""Cohort discovery API endpoints."""

from __future__ import annotations

import asyncio
import logging
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
    request_prediction,
)
from app.services.cache import get_cached_cohort_response, set_cached_cohort_response
from app.services.chain_manager import (
    ChainManagerError,
    get_chain_config,
    is_oracle_configured_for_chain,
)
from app.services.graph_client import GraphClientError, fetch_user_metrics_for_block_range
from app.services.token_client import verify_prediction_payment_tx

router = APIRouter()
_LOG = logging.getLogger(__name__)


@router.post("/discover", response_model=CohortResponse)
async def discover_cohorts(request: CohortRequest) -> CohortResponse:
    """Discover user cohorts via K-Means clustering on subgraph-backed features."""
    try:
        chain_cfg = get_chain_config(request.chain)
    except ChainManagerError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if not is_oracle_configured_for_chain(chain_cfg):
        cached = get_cached_cohort_response(request)
        if cached is not None:
            return cached

    try:
        users = await fetch_user_metrics_for_block_range(
            request.start_block,
            request.end_block,
            request.protocol,
            subgraph_url=chain_cfg.subgraph_url,
        )
    except GraphClientError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"HTTP error querying subgraph: {e}") from e

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

    if not is_oracle_configured_for_chain(chain_cfg):
        set_cached_cohort_response(request, response, settings.COHORT_CACHE_TTL_SECONDS)
        return response

    input_b = build_prediction_input_bytes(response)
    fulfill_b = build_fulfillment_bytes(response)

    try:
        w3 = get_web3(chain_cfg.rpc_url)
        contract = get_oracle_contract(w3, chain_cfg.cohort_oracle_address)
        if settings.REQUIRE_LENS_PAYMENT_FOR_DISCOVER:
            if not request.payment_tx_hash:
                raise HTTPException(
                    status_code=400,
                    detail="payment_tx_hash is required when REQUIRE_LENS_PAYMENT_FOR_DISCOVER=true",
                )
            req_id = verify_prediction_payment_tx(
                w3,
                chain_cfg.cohort_oracle_address,
                request.payment_tx_hash,
                settings.COHORT_LENS_ID,
                request.payment_requester,
            )
            tx_hex = request.payment_tx_hash.strip()
        else:
            if not settings.ORACLE_REQUESTER_PRIVATE_KEY:
                raise HTTPException(
                    status_code=503,
                    detail="ORACLE_REQUESTER_PRIVATE_KEY not set (or enable REQUIRE_LENS_PAYMENT_FOR_DISCOVER)",
                )
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
        _LOG.info("cohort_discover_oracle_registered", extra={"request_id": req_id, "tx": tx_hex})
        return response.model_copy(
            update={
                "oracle_request_id": req_id,
                "oracle_tx_hash": tx_hex,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not register oracle request: {e}",
        ) from e
