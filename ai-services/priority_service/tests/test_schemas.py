import pytest
from pydantic import ValidationError
from app.schemas.priority import (
    ComplaintCategory,
    DisasterType,
    PriorityLevel,
    PriorityAssessRequest,
)


def test_supported_categories_accepted():
    for cat in ["POTHOLES", "STREET_LIGHTS", "GARBAGE"]:
        req = PriorityAssessRequest(
            category=cat,
            title="Valid Issue",
            description="Sample description",
        )
        assert req.category.value == cat

    # Disasters with subtype
    req_disaster = PriorityAssessRequest(
        category="DISASTERS",
        disaster_type="FIRE",
        title="Fire incident",
        description="Flames visible",
    )
    assert req_disaster.category == ComplaintCategory.DISASTERS
    assert req_disaster.disaster_type == DisasterType.FIRE


def test_disasters_defaults_to_other_if_subtype_omitted():
    req = PriorityAssessRequest(
        category="DISASTERS",
        title="Disaster event",
        description="General emergency",
    )
    assert req.category == ComplaintCategory.DISASTERS
    assert req.disaster_type == DisasterType.OTHER


def test_invalid_category_rejected():
    with pytest.raises(ValidationError):
        PriorityAssessRequest(
            category="INVALID_CATEGORY",
            title="Issue",
            description="Description",
        )


def test_inconsistent_disaster_subtype_on_non_disaster_rejected():
    with pytest.raises(ValidationError) as exc_info:
        PriorityAssessRequest(
            category="POTHOLES",
            disaster_type="FIRE",
            title="Pothole issue",
            description="Road crater",
        )
    assert "Disaster subtype" in str(exc_info.value)


def test_oversized_description_rejected():
    with pytest.raises(ValidationError):
        PriorityAssessRequest(
            category="POTHOLES",
            title="Issue",
            description="a" * 5001,  # Exceeds max 5000 characters
        )


def test_invalid_coordinates_rejected():
    with pytest.raises(ValidationError):
        PriorityAssessRequest(
            category="POTHOLES",
            title="Issue",
            description="Sample",
            latitude=95.0,  # Invalid latitude > 90
        )
    with pytest.raises(ValidationError):
        PriorityAssessRequest(
            category="POTHOLES",
            title="Issue",
            description="Sample",
            longitude=185.0,  # Invalid longitude > 180
        )

