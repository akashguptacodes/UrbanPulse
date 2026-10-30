from typing import Tuple
from app.schemas.complaint import ComplaintInput, ComplaintCategory


def check_category_compatibility(target: ComplaintInput, candidate: ComplaintInput) -> Tuple[bool, str]:
    """
    Determine if two complaints are compatible for duplicate evaluation based on
    their category and disaster subtype.
    Returns (is_compatible: bool, reason: str).
    """
    if target.category != candidate.category:
        return False, f"Category mismatch: {target.category.value} vs {candidate.category.value}"

    if target.category == ComplaintCategory.DISASTERS:
        t_sub = target.disaster_type
        c_sub = candidate.disaster_type
        if t_sub and c_sub and t_sub != c_sub:
            return False, f"Disaster subtype mismatch: {t_sub.value} vs {c_sub.value}"

    return True, "Category compatible"

