from fastapi import APIRouter, status
from app.schemas.priority import (
    PriorityAssessRequest,
    PriorityAssessResponse,
)
from app.scoring.engine import calculate_priority_score

router = APIRouter(prefix="/api/v1/priority", tags=["Priority Assessment"])


@router.post(
    "/assess",
    response_model=PriorityAssessResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess severity score, priority level, and safety overrides for a civic complaint",
)
async def assess_complaint_priority(
    request: PriorityAssessRequest,
) -> PriorityAssessResponse:
    """
    Stateless decision-support endpoint.
    Extracts structured severity indicators with negation handling,
    computes bounded score (0.0 to 100.0), maps to priority band,
    and applies deterministic safety overrides for immediate review.
    """
    return calculate_priority_score(request)

