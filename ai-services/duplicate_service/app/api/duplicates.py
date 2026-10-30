from fastapi import APIRouter, status
from app.schemas.complaint import (
    DuplicateEvaluateRequest,
    DuplicateEvaluateResponse,
)
from app.decision.engine import evaluate_duplicates

router = APIRouter(prefix="/api/v1/duplicates", tags=["Duplicate Detection"])


@router.post(
    "/evaluate",
    response_model=DuplicateEvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate candidate complaints for duplicate similarity",
)
async def evaluate_complaint_duplicates(
    request: DuplicateEvaluateRequest,
) -> DuplicateEvaluateResponse:
    """
    Stateless endpoint to evaluate a target complaint against a pool of candidate complaints.
    Uses multi-signal algorithms (geographic distance decay, TF-IDF lexical overlap, and
    dense vector semantic similarity) with explicit category and subtype constraints.
    """
    return evaluate_duplicates(
        target=request.target_complaint,
        candidates=request.candidate_pool,
        max_distance_meters=request.max_distance_meters,
    )


@router.post(
    "/check",
    response_model=DuplicateEvaluateResponse,
    status_code=status.HTTP_200_OK,
    summary="Alias for /evaluate for backward compatibility",
    include_in_schema=True,
)
async def check_complaint_duplicates(
    request: DuplicateEvaluateRequest,
) -> DuplicateEvaluateResponse:
    """Alias for /evaluate."""
    return evaluate_duplicates(
        target=request.target_complaint,
        candidates=request.candidate_pool,
        max_distance_meters=request.max_distance_meters,
    )

