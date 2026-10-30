from app.schemas.complaint import (
    ComplaintInput,
    ComplaintCategory,
    DisasterType,
    DecisionRecommendation,
)
from app.similarity.semantic import MockEmbeddingProvider
from app.decision.engine import evaluate_duplicates
from app.core.config import settings


def test_weights_sum_to_one():
    total = settings.GEO_WEIGHT + settings.LEXICAL_WEIGHT + settings.SEMANTIC_WEIGHT
    assert abs(total - 1.0) < 1e-4
    assert settings.GEO_WEIGHT == 0.40
    assert settings.LEXICAL_WEIGHT == 0.20
    assert settings.SEMANTIC_WEIGHT == 0.40


def test_evaluate_duplicates_identical_complaint_match():
    provider = MockEmbeddingProvider()

    target = ComplaintInput(
        id="c-target",
        title="Deep pothole in middle lane",
        description="Dangerous hole causing vehicle tires to blow out",
        category=ComplaintCategory.POTHOLES,
        latitude=12.9716,
        longitude=77.5946,
    )

    candidate_identical = ComplaintInput(
        id="c-1",
        title="Deep pothole in middle lane",
        description="Dangerous hole causing vehicle tires to blow out",
        category=ComplaintCategory.POTHOLES,
        latitude=12.9716,
        longitude=77.5946,
    )

    candidate_different_cat = ComplaintInput(
        id="c-2",
        title="Deep pothole in middle lane",
        description="Dangerous hole causing vehicle tires to blow out",
        category=ComplaintCategory.GARBAGE,
        latitude=12.9716,
        longitude=77.5946,
    )

    response = evaluate_duplicates(
        target=target,
        candidates=[candidate_identical, candidate_different_cat],
        embedding_provider=provider,
    )

    assert response.target_id == "c-target"
    assert response.candidates_evaluated == 2
    assert response.top_match is not None
    assert response.top_match.candidate_id == "c-1"
    assert response.top_match.combined_score >= 0.75
    assert response.top_match.recommendation == DecisionRecommendation.LIKELY_DUPLICATE
    assert "HIGH_GEO_PROXIMITY" in response.top_match.reason_codes

    # c-2 has different category -> score 0.0, UNLIKELY_DUPLICATE
    match_c2 = next(m for m in response.matches if m.candidate_id == "c-2")
    assert match_c2.combined_score == 0.0
    assert match_c2.recommendation == DecisionRecommendation.UNLIKELY_DUPLICATE
    assert "CATEGORY_MISMATCH" in match_c2.reason_codes


def test_disaster_subtype_mismatch_disqualified():
    provider = MockEmbeddingProvider()
    target = ComplaintInput(
        id="target-disaster",
        title="Electrical building fire",
        description="Flames on second floor",
        category=ComplaintCategory.DISASTERS,
        disaster_type=DisasterType.FIRE,
        latitude=12.9716,
        longitude=77.5946,
    )
    cand_flood = ComplaintInput(
        id="cand-flood",
        title="Street water level rising quickly",
        description="Flood entering basements",
        category=ComplaintCategory.DISASTERS,
        disaster_type=DisasterType.FLOOD,
        latitude=12.9716,
        longitude=77.5946,
    )

    response = evaluate_duplicates(
        target=target,
        candidates=[cand_flood],
        embedding_provider=provider,
    )
    assert response.top_match.combined_score == 0.0
    assert response.top_match.recommendation == DecisionRecommendation.UNLIKELY_DUPLICATE
    assert "DISASTER_SUBTYPE_MISMATCH" in response.top_match.reason_codes


def test_self_match_excluded():
    provider = MockEmbeddingProvider()
    target = ComplaintInput(
        id="target-1",
        title="Broken streetlight",
        description="Near park gate",
        category=ComplaintCategory.STREET_LIGHTS,
        latitude=12.9716,
        longitude=77.5946,
    )

    response = evaluate_duplicates(
        target=target,
        candidates=[target],  # Target itself provided in candidate pool
        embedding_provider=provider,
    )
    assert response.candidates_evaluated == 0
    assert len(response.matches) == 0
    assert response.top_match is None


def test_tie_breaking_order():
    provider = MockEmbeddingProvider()
    target = ComplaintInput(
        id="target",
        title="Garbage pile",
        description="Trash left on sidewalk",
        category=ComplaintCategory.GARBAGE,
        latitude=12.97160,
        longitude=77.59460,
    )
    # Two candidates with identical text but different distances
    cand_closer = ComplaintInput(
        id="cand-b",
        title="Garbage pile",
        description="Trash left on sidewalk",
        category=ComplaintCategory.GARBAGE,
        latitude=12.97165,
        longitude=77.59460,
    )
    cand_farther = ComplaintInput(
        id="cand-a",
        title="Garbage pile",
        description="Trash left on sidewalk",
        category=ComplaintCategory.GARBAGE,
        latitude=12.97200,
        longitude=77.59460,
    )

    response = evaluate_duplicates(
        target=target,
        candidates=[cand_farther, cand_closer],
        embedding_provider=provider,
    )
    # The closer candidate should have higher score and appear first
    assert response.matches[0].candidate_id == "cand-b"
    assert response.matches[0].combined_score >= response.matches[1].combined_score


def test_hyper_local_proximity_promoted_to_possible_duplicate():
    """Verify that same-category complaints with exact/near-zero distance (<=15m)
    are promoted to POSSIBLE_DUPLICATE even with completely divergent wording."""
    provider = MockEmbeddingProvider()
    target = ComplaintInput(
        id="c-target",
        title="Very hazardous, near about a 2m radius",
        description="Dangerous hole on asphalt",
        category=ComplaintCategory.POTHOLES,
        latitude=25.772827,
        longitude=84.300781,
    )
    # Candidate at exact same coordinates (0.0m) with completely different wording
    cand_same_spot = ComplaintInput(
        id="c-duplicate-spot",
        title="3 accidents caused due to this big pothole",
        description="Vehicles falling and tires damaged",
        category=ComplaintCategory.POTHOLES,
        latitude=25.772827,
        longitude=84.300781,
    )

    response = evaluate_duplicates(
        target=target,
        candidates=[cand_same_spot],
        embedding_provider=provider,
    )

    assert response.candidates_evaluated == 1
    match = response.top_match
    assert match is not None
    assert match.distance_meters == 0.0
    assert match.recommendation == DecisionRecommendation.POSSIBLE_DUPLICATE
    assert match.combined_score >= 0.50
    assert "HYPER_LOCAL_PROXIMITY_MATCH" in match.reason_codes


