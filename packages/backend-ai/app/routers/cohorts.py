"""Cohort discovery API endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.clustering import perform_clustering
from app.schemas.cohort import CohortRequest, CohortResponse

router = APIRouter()


@router.post("/discover", response_model=CohortResponse)
async def discover_cohorts(request: CohortRequest) -> CohortResponse:
    """Discover user cohorts via K-Means clustering on configured features."""
    try:
        return perform_clustering(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
