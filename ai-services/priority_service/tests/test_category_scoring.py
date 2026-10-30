from app.schemas.priority import (
    ComplaintCategory,
    PriorityLevel,
    PriorityAssessRequest,
)
from app.scoring.engine import calculate_priority_score


def test_routine_pothole_low_priority():
    req = PriorityAssessRequest(
        category=ComplaintCategory.POTHOLES,
        title="Small road bump",
        description="Minor pothole on neighborhood street corner.",
    )
    res = calculate_priority_score(req)
    # Baseline is 20.0 points -> LOW priority
    assert res.severity_score == 20.0
    assert res.priority_level == PriorityLevel.LOW
    assert res.safety_override_applied is False


def test_severe_pothole_high_priority():
    req = PriorityAssessRequest(
        category=ComplaintCategory.POTHOLES,
        title="Massive road crater",
        description="Deep crater near school with both lanes blocked and road impassable.",
    )
    res = calculate_priority_score(req)
    # Baseline (20) + Public impact school (15) + Damage extent (15) >= 50.0
    assert res.severity_score >= 50.0
    assert res.priority_level in (PriorityLevel.HIGH, PriorityLevel.CRITICAL)


def test_routine_street_light_low_priority():
    req = PriorityAssessRequest(
        category=ComplaintCategory.STREET_LIGHTS,
        title="Bulb not working",
        description="Single light bulb is burnt out on pole 12.",
    )
    res = calculate_priority_score(req)
    # Baseline is 15.0 -> LOW priority
    assert res.severity_score == 15.0
    assert res.priority_level == PriorityLevel.LOW


def test_street_light_with_electrical_hazard():
    req = PriorityAssessRequest(
        category=ComplaintCategory.STREET_LIGHTS,
        title="Broken light pole",
        description="Light pole has exposed live wire and electrical sparks flying near crosswalk.",
    )
    res = calculate_priority_score(req)
    assert res.safety_override_applied is True
    assert res.priority_level == PriorityLevel.CRITICAL
    assert res.severity_score >= 90.0
    assert "SAFETY_OVERRIDE_ELECTRICAL_HAZARD" in res.safety_reasons


def test_routine_garbage_low_priority():
    req = PriorityAssessRequest(
        category=ComplaintCategory.GARBAGE,
        title="Trash bin full",
        description="Sidewalk trash bin needs routine collection.",
    )
    res = calculate_priority_score(req)
    assert res.severity_score == 15.0
    assert res.priority_level == PriorityLevel.LOW


def test_hazardous_garbage_elevation():
    req = PriorityAssessRequest(
        category=ComplaintCategory.GARBAGE,
        title="Illegal dumping",
        description="Hazardous waste and chemical spill dumped near kindergarten.",
    )
    res = calculate_priority_score(req)
    assert res.severity_score >= 50.0
    assert res.priority_level in (PriorityLevel.HIGH, PriorityLevel.CRITICAL)


def test_deterministic_scoring_identical_inputs():
    req = PriorityAssessRequest(
        category=ComplaintCategory.POTHOLES,
        title="Deep hole",
        description="Deep crater near arterial road.",
    )
    res1 = calculate_priority_score(req)
    res2 = calculate_priority_score(req)
    assert res1.severity_score == res2.severity_score
    assert res1.priority_level == res2.priority_level
    assert res1.score_breakdown == res2.score_breakdown

