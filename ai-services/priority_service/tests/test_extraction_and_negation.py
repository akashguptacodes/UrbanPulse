from app.extraction.indicators import extract_indicators
from app.extraction.negation import is_phrase_negated


def test_explicit_danger_phrases_detected():
    text = "There is a live wire and open manhole near the crosswalk."
    indicators = extract_indicators(text)
    phrases = {ind.matched_phrase for ind in indicators if not ind.is_negated}
    assert "live wire" in phrases
    assert "open manhole" in phrases
    assert "crosswalk" in phrases


def test_whitespace_and_case_normalization():
    text = "   DANGEROUS    SPARKING TRANSFORMER   NEAR   HOSPITAL   "
    indicators = extract_indicators(text)
    phrases = {ind.matched_phrase for ind in indicators}
    assert "sparking transformer" in phrases
    assert "hospital" in phrases


def test_repeated_phrases_deduplicated():
    text = "Pothole has deep crater. I repeat, very deep crater on the street."
    indicators = extract_indicators(text)
    crater_matches = [i for i in indicators if i.matched_phrase == "deep crater"]
    # Only matched once to avoid score inflation
    assert len(crater_matches) == 1


def test_negation_preceding_no():
    text = "There is no live wire on this road."
    indicators = extract_indicators(text)
    assert len(indicators) == 1
    assert indicators[0].matched_phrase == "live wire"
    assert indicators[0].is_negated is True
    assert indicators[0].severity_contribution == 0.0


def test_negation_preceding_not():
    text = "The issue is not dangerous and not an active fire."
    indicators = extract_indicators(text)
    fire_match = next((i for i in indicators if i.matched_phrase == "active fire"), None)
    assert fire_match is not None
    assert fire_match.is_negated is True
    assert fire_match.severity_contribution == 0.0


def test_negation_post_cue():
    text = "The fire is extinguished and completely under control."
    # Direct test of phrase negation
    negated, reason = is_phrase_negated(text, match_start=4, match_end=8)
    assert negated is True


def test_clause_boundary_resets_negation():
    # Negation in first clause should NOT negate hazard in second clause
    text = "There is no traffic jam, but a live wire is sparking on the ground."
    indicators = extract_indicators(text)
    live_wire = next(i for i in indicators if i.matched_phrase == "live wire")
    assert live_wire.is_negated is False
    assert live_wire.severity_contribution > 0.0


def test_empty_and_whitespace_text_safe():
    assert extract_indicators("") == []
    assert extract_indicators("   \n\t   ") == []
    assert extract_indicators(None) == []

