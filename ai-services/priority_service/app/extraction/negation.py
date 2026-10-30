import re
from typing import List, Set, Tuple

# Deterministic negation keywords
NEGATION_CUES: Set[str] = {
    "no",
    "not",
    "never",
    "without",
    "neither",
    "nor",
    "none",
    "zero",
    "false",
    "resolved",
    "cleared",
    "fixed",
    "extinguished",
    "repaired",
    "stopped",
    "avoid",
    "prevent",
}

# Post-fix negation expressions (e.g., "fire is out", "sparking has stopped")
POST_NEGATION_CUES: Set[str] = {
    "out",
    "extinguished",
    "resolved",
    "cleared",
    "fixed",
    "repaired",
    "stopped",
    "under control",
}

# Clause boundaries that reset negation scope
CLAUSE_BOUNDARIES = re.compile(r"[,;:.!?]|\b(but|however|although|nevertheless|yet)\b", re.IGNORECASE)


def is_phrase_negated(
    full_text: str,
    match_start: int,
    match_end: int,
    window_tokens: int = 4,
) -> Tuple[bool, str]:
    """
    Determine if a matched term is negated within its sentence clause.
    Returns (is_negated: bool, reason: str).
    """
    # 1. Extract prefix context up to the nearest preceding clause boundary
    prefix = full_text[:match_start]
    # Find last clause boundary before the match
    boundaries = list(CLAUSE_BOUNDARIES.finditer(prefix))
    clause_start = boundaries[-1].end() if boundaries else 0
    clause_prefix = prefix[clause_start:].strip()

    prefix_tokens = re.findall(r"\b\w+\b", clause_prefix.lower())
    # Inspect the preceding tokens within the window
    window = prefix_tokens[-window_tokens:] if len(prefix_tokens) >= window_tokens else prefix_tokens

    for cue in NEGATION_CUES:
        if cue in window:
            return True, f"Preceding negation cue '{cue}' in clause: '{clause_prefix}'"

    # 2. Check immediate post-phrase negation (e.g., "fire is out", "fire is extinguished")
    suffix = full_text[match_end:]
    suffix_boundaries = list(CLAUSE_BOUNDARIES.finditer(suffix))
    clause_end = suffix_boundaries[0].start() if suffix_boundaries else len(suffix)
    clause_suffix = suffix[:clause_end].strip()

    suffix_tokens = re.findall(r"\b\w+\b", clause_suffix.lower())
    short_suffix_tokens = suffix_tokens[:3]  # Check first 3 tokens after term
    for cue in POST_NEGATION_CUES:
        if cue in short_suffix_tokens or f"is {cue}" in clause_suffix.lower():
            return True, f"Post-phrase negation cue '{cue}' in clause: '{clause_suffix}'"

    return False, "Affirmative context"

