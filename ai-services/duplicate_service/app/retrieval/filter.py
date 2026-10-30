from typing import List
from app.schemas.complaint import ComplaintInput
from app.core.config import settings


def filter_candidate_pool(
    target: ComplaintInput,
    candidates: List[ComplaintInput],
    max_limit: int = None,
) -> List[ComplaintInput]:
    """
    Sanitize and bound candidate pool:
    - Exclude the target complaint itself (self-match).
    - Cap candidates to max_limit (defaults to settings.MAX_CANDIDATE_POOL_SIZE).
    """
    limit = max_limit or settings.MAX_CANDIDATE_POOL_SIZE

    valid_candidates: List[ComplaintInput] = []
    seen_ids = set()

    for cand in candidates:
        # Exclude self-match
        if cand.id == target.id:
            continue
        # Avoid duplicate candidate IDs in the pool
        if cand.id in seen_ids:
            continue
        seen_ids.add(cand.id)
        valid_candidates.append(cand)
        if len(valid_candidates) >= limit:
            break

    return valid_candidates

