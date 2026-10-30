from typing import List, Tuple
from app.schemas.priority import (
    ComplaintCategory,
    DisasterType,
    DetectedIndicator,
)


def evaluate_safety_overrides(
    category: ComplaintCategory,
    disaster_type: DisasterType,
    text: str,
    indicators: List[DetectedIndicator],
) -> Tuple[bool, List[str], str]:
    """
    Evaluate deterministic safety overrides.
    Returns (safety_override: bool, reason_codes: List[str], rationale: str).
    Ensures that negated cues do NOT trigger positive safety overrides.
    """
    clean_text = text.lower()
    reasons: List[str] = []

    # Map affirmative (non-negated) matched phrases
    affirmative_phrases = {
        ind.matched_phrase.lower() for ind in indicators if not ind.is_negated
    }

    # 1. Active Fire Override
    if category == ComplaintCategory.DISASTERS and disaster_type == DisasterType.FIRE:
        # Check if the fire mention is explicitly negated
        fire_negated = any(
            ind.matched_phrase.lower() in {"active fire", "flames spreading"} and ind.is_negated
            for ind in indicators
        )
        if not fire_negated:
            reasons.append("SAFETY_OVERRIDE_ACTIVE_FIRE")

    # Also fire if active fire phrases appear affirmatively in non-disaster category
    elif "active fire" in affirmative_phrases or "flames spreading" in affirmative_phrases:
        reasons.append("SAFETY_OVERRIDE_ACTIVE_FIRE")

    # 2. Severe High-Voltage Electrical Hazard Override
    electrical_cues = {"live wire", "sparking transformer", "arcing cable", "electrocution risk"}
    if any(cue in affirmative_phrases for cue in electrical_cues):
        reasons.append("SAFETY_OVERRIDE_ELECTRICAL_HAZARD")

    # 3. Structural Collapse Hazard Override
    if "structural collapse" in affirmative_phrases or "building collapse" in clean_text:
        # Check if collapsed statement is negated
        collapse_negated = any(
            ind.matched_phrase == "structural collapse" and ind.is_negated for ind in indicators
        )
        if not collapse_negated:
            reasons.append("SAFETY_OVERRIDE_STRUCTURAL_COLLAPSE")

    # 4. Imminent Life Threat & Trapped Persons Override
    life_cues = {"trapped person", "people trapped", "hazard to life", "emergency rescue"}
    if any(cue in affirmative_phrases for cue in life_cues):
        reasons.append("SAFETY_OVERRIDE_LIFE_HAZARD")

    # 5. Severe Flood with Rising Water / Impassable Hazards Override
    if category == ComplaintCategory.DISASTERS and disaster_type == DisasterType.FLOOD:
        flood_hazard_cues = {
            "water rising rapidly",
            "water level rising",
            "submerged road",
            "waist high water",
            "entire road blocked",
            "impassable road",
        }
        if any(cue in affirmative_phrases for cue in flood_hazard_cues) or any(cue in affirmative_phrases for cue in life_cues):
            reasons.append("SAFETY_OVERRIDE_SEVERE_FLOOD")

    if reasons:
        summary_reasons = ", ".join(reasons)
        rationale = (
            f"CRITICAL SAFETY OVERRIDE TRIGGERED ({summary_reasons}). "
            f"Immediate human inspection recommended. "
            f"Disclaimer: UrbanPulse is a decision-support tool and does not dispatch emergency responders directly."
        )
        return True, reasons, rationale

    return False, [], ""

