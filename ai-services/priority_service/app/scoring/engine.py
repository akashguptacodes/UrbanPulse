from typing import List
from app.core.config import settings
from app.schemas.priority import (
    ComplaintCategory,
    DisasterType,
    PriorityLevel,
    AssessmentMethod,
    PriorityAssessRequest,
    ScoreBreakdown,
    PriorityAssessResponse,
)
from app.extraction.indicators import extract_indicators
from app.safety_rules.rules import evaluate_safety_overrides


def calculate_priority_score(request: PriorityAssessRequest) -> PriorityAssessResponse:
    """
    Compute explainable, bounded severity score and operational priority level
    using category baseline weights, NLP indicator extraction with negation handling,
    and deterministic safety overrides.
    """
    # 1. Unify text
    clean_title = (request.title or "").strip()
    clean_desc = (request.description or "").strip()
    full_text = f"{clean_title}. {clean_desc}".strip() if clean_desc else clean_title

    # 2. Extract NLP indicators (with negation awareness)
    indicators = extract_indicators(full_text)

    # 3. Category Base Weight
    category_bases = {
        ComplaintCategory.DISASTERS: settings.BASE_SCORE_DISASTERS,
        ComplaintCategory.POTHOLES: settings.BASE_SCORE_POTHOLES,
        ComplaintCategory.STREET_LIGHTS: settings.BASE_SCORE_STREET_LIGHTS,
        ComplaintCategory.GARBAGE: settings.BASE_SCORE_GARBAGE,
    }
    base_score = category_bases.get(request.category, 20.0)

    # 4. Sum affirmative factor contributions with dimension caps
    safety_points = 0.0
    impact_points = 0.0
    damage_points = 0.0
    urgency_points = 0.0

    for ind in indicators:
        if ind.is_negated:
            continue
        if ind.dimension in ("SAFETY_HAZARD", "IMMINENT_DANGER"):
            safety_points += ind.severity_contribution
        elif ind.dimension == "PUBLIC_IMPACT":
            impact_points += ind.severity_contribution
        elif ind.dimension == "DAMAGE_EXTENT":
            damage_points += ind.severity_contribution
        elif ind.dimension == "TIME_SENSITIVITY":
            urgency_points += ind.severity_contribution

    # Apply dimension caps
    f_safety = min(safety_points, settings.MAX_FACTOR_SAFETY)
    f_impact = min(impact_points, settings.MAX_FACTOR_IMPACT)
    f_damage = min(damage_points, settings.MAX_FACTOR_DAMAGE)
    f_urgency = min(urgency_points, settings.MAX_FACTOR_URGENCY)

    raw_score = base_score + f_safety + f_impact + f_damage + f_urgency
    bounded_score = round(min(100.0, max(0.0, raw_score)), 1)

    # 5. Deterministic Safety Overrides
    is_override, reason_codes, override_rationale = evaluate_safety_overrides(
        category=request.category,
        disaster_type=request.disaster_type,
        text=full_text,
        indicators=indicators,
    )

    if is_override:
        final_score = max(bounded_score, settings.SAFETY_OVERRIDE_MIN_SCORE)
        priority_level = PriorityLevel.CRITICAL
        explanation = override_rationale
    else:
        final_score = bounded_score
        if final_score >= settings.THRESHOLD_CRITICAL:
            priority_level = PriorityLevel.CRITICAL
        elif final_score >= settings.THRESHOLD_HIGH:
            priority_level = PriorityLevel.HIGH
        elif final_score >= settings.THRESHOLD_MEDIUM:
            priority_level = PriorityLevel.MEDIUM
        else:
            priority_level = PriorityLevel.LOW

        factor_summary = []
        if f_safety > 0:
            factor_summary.append(f"safety hazard (+{f_safety:.1f})")
        if f_impact > 0:
            factor_summary.append(f"public impact (+{f_impact:.1f})")
        if f_damage > 0:
            factor_summary.append(f"damage extent (+{f_damage:.1f})")
        if f_urgency > 0:
            factor_summary.append(f"urgency (+{f_urgency:.1f})")

        factors_text = f" with {', '.join(factor_summary)}" if factor_summary else " with routine baseline"
        explanation = (
            f"Evaluated as {priority_level.value} (score: {final_score:.1f}/100) based on "
            f"{request.category.value} category base ({base_score:.1f}){factors_text}."
        )

    breakdown = ScoreBreakdown(
        base_category_score=base_score,
        safety_hazards_contribution=f_safety,
        public_impact_contribution=f_impact,
        damage_extent_contribution=f_damage,
        urgency_contribution=f_urgency,
        raw_score=raw_score,
        final_score=final_score,
    )

    return PriorityAssessResponse(
        complaint_id=request.complaint_id,
        severity_score=final_score,
        priority_level=priority_level,
        safety_override_applied=is_override,
        safety_reasons=reason_codes,
        human_review_recommended=True,
        detected_indicators=indicators,
        score_breakdown=breakdown,
        assessment_method=AssessmentMethod.RULE_BASED_BASELINE,
        rule_version=settings.RULES_VERSION,
        explanation=explanation,
    )

