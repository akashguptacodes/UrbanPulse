from app.schemas.complaint import ComplaintInput, ComplaintCategory, DisasterType
from app.similarity.category import check_category_compatibility


def create_complaint(id: str, cat: ComplaintCategory, disaster: DisasterType = None):
    return ComplaintInput(
        id=id,
        title=f"Sample issue {id}",
        description="Sample description",
        category=cat,
        disaster_type=disaster,
        latitude=12.9716,
        longitude=77.5946,
    )


def test_matching_categories_compatible():
    c1 = create_complaint("1", ComplaintCategory.POTHOLES)
    c2 = create_complaint("2", ComplaintCategory.POTHOLES)
    compatible, reason = check_category_compatibility(c1, c2)
    assert compatible is True
    assert "compatible" in reason.lower()


def test_mismatched_categories_incompatible():
    c1 = create_complaint("1", ComplaintCategory.POTHOLES)
    c2 = create_complaint("2", ComplaintCategory.GARBAGE)
    compatible, reason = check_category_compatibility(c1, c2)
    assert compatible is False
    assert "Category mismatch" in reason


def test_matching_disaster_subtypes_compatible():
    c1 = create_complaint("1", ComplaintCategory.DISASTERS, DisasterType.FIRE)
    c2 = create_complaint("2", ComplaintCategory.DISASTERS, DisasterType.FIRE)
    compatible, reason = check_category_compatibility(c1, c2)
    assert compatible is True


def test_mismatched_disaster_subtypes_incompatible():
    c1 = create_complaint("1", ComplaintCategory.DISASTERS, DisasterType.FIRE)
    c2 = create_complaint("2", ComplaintCategory.DISASTERS, DisasterType.FLOOD)
    compatible, reason = check_category_compatibility(c1, c2)
    assert compatible is False
    assert "Disaster subtype mismatch" in reason

