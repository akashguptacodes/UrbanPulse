from typing import List, Dict, Any, Optional
import math
import re

# Fixed list of categories for one-hot encoding
CATEGORIES = ["POTHOLES", "STREET_LIGHTS", "GARBAGE", "DISASTERS"]
DISASTER_TYPES = ["FIRE", "FLOOD", "OTHER"]

class FeatureExtractor:
    """
    Extracts a clean, fixed-size numerical feature vector for the XGBoost model.
    Combines:
    1. Category & Sub-type one-hot encodings (7 features)
    2. Text length & punctuation heuristics (5 features)
    3. Keyword risk indicators from existing dictionary (4 features)
    """

    @staticmethod
    def extract_features(
        title: str,
        description: str,
        category: str,
        disaster_type: Optional[str] = None
    ) -> List[float]:
        clean_title = (title or "").strip()
        clean_desc = (description or "").strip()
        full_text = f"{clean_title}. {clean_desc}".lower()

        features: List[float] = []

        # 1. One-hot encode primary category (4 features)
        cat_upper = (category or "").upper()
        if "GARBAGE" in cat_upper:
            cat_upper = "GARBAGE"
        for cat in CATEGORIES:
            features.append(1.0 if cat_upper == cat else 0.0)

        # 2. One-hot encode disaster type (3 features)
        dis_upper = (disaster_type or "").upper() if disaster_type else ""
        for dt in DISASTER_TYPES:
            features.append(1.0 if dis_upper == dt else 0.0)

        # 3. Text length & formatting heuristics (5 features)
        char_len = float(len(full_text))
        word_count = float(len(full_text.split()))
        exclamation_count = float(full_text.count("!"))
        has_digits = 1.0 if re.search(r"\d+", full_text) else 0.0
        # Ratio of uppercase letters in the original raw text
        raw_combined = f"{clean_title} {clean_desc}"
        upper_ratio = sum(1 for c in raw_combined if c.isupper()) / max(1.0, float(len(raw_combined)))

        features.extend([
            char_len,
            word_count,
            exclamation_count,
            has_digits,
            round(upper_ratio, 4)
        ])

        # 4. Domain Urgent Keyword Presence (4 heuristic features)
        safety_cues = ["danger", "hazard", "spark", "wire", "shock", "fire", "flame", "collapse", "trapped", "blood", "toxic", "leak"]
        impact_cues = ["hospital", "school", "traffic", "choked", "blocked", "bus stop", "market", "intersection", "ambulance"]
        damage_cues = ["blowout", "burst", "broken", "ruptured", "chasm", "crater", "sinkhole", "submerged"]
        urgency_cues = ["urgent", "immediately", "emergency", "hours", "days", "serious"]

        safety_score = sum(1.0 for cue in safety_cues if cue in full_text)
        impact_score = sum(1.0 for cue in impact_cues if cue in full_text)
        damage_score = sum(1.0 for cue in damage_cues if cue in full_text)
        urgency_score = sum(1.0 for cue in urgency_cues if cue in full_text)

        features.extend([safety_score, impact_score, damage_score, urgency_score])

        return features

    @classmethod
    def feature_names(cls) -> List[str]:
        names = [f"cat_{c.lower()}" for c in CATEGORIES]
        names.extend([f"dis_{d.lower()}" for d in DISASTER_TYPES])
        names.extend(["char_length", "word_count", "exclamation_count", "has_digits", "upper_ratio"])
        names.extend(["safety_cue_count", "impact_cue_count", "damage_cue_count", "urgency_cue_count"])
        return names

