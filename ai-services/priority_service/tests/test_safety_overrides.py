from app.schemas.priority import (
    ComplaintCategory,
    DisasterType,
    PriorityLevel,
    PriorityAssessRequest,
)
from app.scoring.engine import calculate_priority_score


def test_active_fire_safety_override():
    req = PriorityAssessRequest(
        category=ComplaintCategory.DISASTERS,
        disaster_type=DisasterType.FIRE,
        title="Building fire",
        description="Active fire with flames spreading to second floor.",
    )
    res = calculate_priority_score(req)
    assert res.safety_override_applied is True
    assert res.priority_level == PriorityLevel.CRITICAL
    assert res.severity_score >= 90.0
    assert "SAFETY_OVERRIDE_ACTIVE_FIRE" in res.safety_reasons
    assert "CRITICAL SAFETY OVERRIDE" in res.explanation


def test_negated_fire_does_not_override():
    req = PriorityAssessRequest(
        category=ComplaintCategory.DISASTERS,
        disaster_type=DisasterType.OTHER,
        title="Inspection report",
        description="Smoke check completed, there is no active fire and no hazard to life.",
    )
    res = calculate_priority_score(req)
    assert res.safety_override_applied is False
    assert "SAFETY_OVERRIDE_ACTIVE_FIRE" not in res.safety_reasons


def test_electrical_hazard_safety_override():
    req = PriorityAssessRequest(
        category=ComplaintCategory.STREET_LIGHTS,
        title="Live wire fallen",
        description="Live wire sparking transformer after storm.",
    )
    res = calculate_priority_score(req)
    assert res.safety_override_applied is True
    assert res.priority_level == PriorityLevel.CRITICAL
    assert "SAFETY_OVERRIDE_ELECTRICAL_HAZARD" in res.safety_reasons


def test_structural_collapse_safety_override():
    req = PriorityAssessRequest(
        category=ComplaintCategory.POTHOLES,
        title="Bridge collapse",
        description="Road section collapsed, structural collapse near highway.",
    )
    res = calculate_priority_score(req)
    assert res.safety_override_applied is True
    assert res.priority_level == PriorityLevel.CRITICAL
    assert "SAFETY_OVERRIDE_STRUCTURAL_COLLAPSE" in res.safety_reasons


def test_trapped_person_safety_override():
    req = PriorityAssessRequest(
        category=ComplaintCategory.DISASTERS,
        disaster_type=DisasterType.FLOOD,
        title="Flood rescue needed",
        description="Trapped person inside vehicle as water level rising rapidly.",
    )
    res = calculate_priority_score(req)
    assert res.safety_override_applied is True
    assert res.priority_level == PriorityLevel.CRITICAL
    assert "SAFETY_OVERRIDE_LIFE_HAZARD" in res.safety_reasons
    assert "SAFETY_OVERRIDE_SEVERE_FLOOD" in res.safety_reasons


def test_safety_override_disclaimer_present():
    req = PriorityAssessRequest(
        category=ComplaintCategory.DISASTERS,
        disaster_type=DisasterType.FIRE,
        title="Fire",
        description="Active fire",
    )
    res = calculate_priority_score(req)
    # The explanation must note that UrbanPulse does not contact emergency services directly
    assert "does not dispatch emergency responders directly" in res.explanation

