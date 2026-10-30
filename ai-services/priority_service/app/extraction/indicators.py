import re
from typing import Dict, List, Tuple
from app.schemas.priority import DetectedIndicator
from app.extraction.negation import is_phrase_negated

# Grouped indicator definitions with points contribution:
# (dimension, phrase, base_weight)
INDICATOR_DICTIONARY: List[Tuple[str, str, float]] = [
    # 1. Safety Hazards
    ("SAFETY_HAZARD", "live wire", 35.0),
    ("SAFETY_HAZARD", "exposed wire", 30.0),
    ("SAFETY_HAZARD", "sparking transformer", 35.0),
    ("SAFETY_HAZARD", "electrical sparks", 25.0),
    ("SAFETY_HAZARD", "sparking", 20.0),
    ("SAFETY_HAZARD", "arcing cable", 30.0),
    ("SAFETY_HAZARD", "exposed cable", 20.0),
    ("SAFETY_HAZARD", "open manhole", 25.0),
    ("SAFETY_HAZARD", "missing manhole cover", 25.0),
    ("SAFETY_HAZARD", "gas leak", 30.0),
    ("SAFETY_HAZARD", "chemical spill", 25.0),
    ("SAFETY_HAZARD", "toxic fumes", 25.0),
    ("SAFETY_HAZARD", "sinkhole", 25.0),
    ("SAFETY_HAZARD", "falling debris", 20.0),
    ("SAFETY_HAZARD", "structural collapse", 30.0),
    ("SAFETY_HAZARD", "electrocution risk", 30.0),

    # 2. Imminent Danger & Life Threat
    ("IMMINENT_DANGER", "active fire", 35.0),
    ("IMMINENT_DANGER", "flames spreading", 35.0),
    ("IMMINENT_DANGER", "explosion", 35.0),
    ("IMMINENT_DANGER", "trapped person", 35.0),
    ("IMMINENT_DANGER", "people trapped", 35.0),
    ("IMMINENT_DANGER", "severe injury", 25.0),
    ("IMMINENT_DANGER", "injured person", 25.0),
    ("IMMINENT_DANGER", "hazard to life", 30.0),
    ("IMMINENT_DANGER", "emergency rescue", 30.0),
    ("IMMINENT_DANGER", "unconscious", 25.0),

    # 3. Public Impact & Sensitive Infrastructure
    ("PUBLIC_IMPACT", "hospital", 15.0),
    ("PUBLIC_IMPACT", "school", 15.0),
    ("PUBLIC_IMPACT", "kindergarten", 15.0),
    ("PUBLIC_IMPACT", "daycare", 15.0),
    ("PUBLIC_IMPACT", "nursing home", 15.0),
    ("PUBLIC_IMPACT", "elderly center", 15.0),
    ("PUBLIC_IMPACT", "pedestrian crossing", 10.0),
    ("PUBLIC_IMPACT", "crosswalk", 10.0),
    ("PUBLIC_IMPACT", "bus stop", 10.0),
    ("PUBLIC_IMPACT", "bus route", 10.0),
    ("PUBLIC_IMPACT", "metro station", 10.0),
    ("PUBLIC_IMPACT", "arterial road", 10.0),
    ("PUBLIC_IMPACT", "major intersection", 10.0),
    ("PUBLIC_IMPACT", "highway", 10.0),

    # 4. Damage Extent & Operational Disruption
    ("DAMAGE_EXTENT", "deep crater", 15.0),
    ("DAMAGE_EXTENT", "massive pothole", 15.0),
    ("DAMAGE_EXTENT", "large pothole", 10.0),
    ("DAMAGE_EXTENT", "both lanes blocked", 15.0),
    ("DAMAGE_EXTENT", "entire road blocked", 15.0),
    ("DAMAGE_EXTENT", "entire street blocked", 15.0),
    ("DAMAGE_EXTENT", "impassable road", 15.0),
    ("DAMAGE_EXTENT", "road impassable", 15.0),
    ("DAMAGE_EXTENT", "submerged road", 15.0),
    ("DAMAGE_EXTENT", "waist high water", 15.0),
    ("DAMAGE_EXTENT", "multiple lights out", 10.0),
    ("DAMAGE_EXTENT", "entire block dark", 12.0),
    ("DAMAGE_EXTENT", "overflowing dumpster", 8.0),
    ("DAMAGE_EXTENT", "massive garbage pile", 10.0),
    ("DAMAGE_EXTENT", "medical waste", 20.0),
    ("DAMAGE_EXTENT", "hazardous waste", 20.0),

    # 5. Time Sensitivity & Escalation
    ("TIME_SENSITIVITY", "water rising rapidly", 10.0),
    ("TIME_SENSITIVITY", "water level rising", 10.0),
    ("TIME_SENSITIVITY", "fire spreading quickly", 10.0),
    ("TIME_SENSITIVITY", "continuous spark", 10.0),
    ("TIME_SENSITIVITY", "sparks flying", 10.0),
    ("TIME_SENSITIVITY", "overflowing right now", 8.0),
    ("TIME_SENSITIVITY", "worsening quickly", 8.0),
    ("TIME_SENSITIVITY", "immediate threat", 10.0),
]


def extract_indicators(text: str) -> List[DetectedIndicator]:
    """
    Extract structured severity indicators from text with deterministic negation detection
    and deduplication.
    """
    if not text or not text.strip():
        return []

    clean_text = text.strip()
    detected: List[DetectedIndicator] = []
    seen_phrases = set()

    for dimension, phrase, weight in INDICATOR_DICTIONARY:
        pattern = re.compile(rf"\b{re.escape(phrase)}\b", re.IGNORECASE)
        match = pattern.search(clean_text)

        if match:
            # Avoid duplicate counting of identical phrase
            if phrase in seen_phrases:
                continue
            seen_phrases.add(phrase)

            start, end = match.span()
            negated, neg_reason = is_phrase_negated(clean_text, start, end)

            # Extract 40-char snippet around match
            snippet_start = max(0, start - 20)
            snippet_end = min(len(clean_text), end + 20)
            snippet = clean_text[snippet_start:snippet_end].strip()

            detected.append(
                DetectedIndicator(
                    dimension=dimension,
                    matched_phrase=phrase,
                    severity_contribution=0.0 if negated else weight,
                    is_negated=negated,
                    context_snippet=snippet,
                )
            )

    return detected

