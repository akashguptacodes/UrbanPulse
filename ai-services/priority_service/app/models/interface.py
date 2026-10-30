from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.schemas.priority import PriorityAssessRequest, PriorityAssessResponse


class PriorityModelInterface(ABC):
    """
    Abstract interface for severity scoring and priority estimation models.
    Supports pluggable models (e.g. rule-based baseline, future supervised Random Forest/XGBoost).
    """

    @abstractmethod
    def predict(self, request: PriorityAssessRequest) -> PriorityAssessResponse:
        """Generate priority assessment and explainable score for the given complaint."""
        pass


class ModelRequirementsDocumentation:
    """
    Documentation and specification for future supervised machine learning models.
    UrbanPulse does NOT train ML models on unverified or synthetic labels.

    Prerequisites for training Random Forest / XGBoost model:
    1. Labeled Dataset Size: Minimum 1,500 historical complaints with human administrator priority labels.
    2. Label Distribution: Stratified distribution across LOW, MEDIUM, HIGH, CRITICAL.
    3. Features:
       - Categorical: Category (One-Hot), Disaster Subtype (One-Hot)
       - Text Embeddings / TF-IDF: Top 500 n-gram features from complaint descriptions
       - Extracted Factors: Binary and count features from NLP indicator detection
       - Temporal/Geographic: Location cluster density (if privacy approved)
    4. Validation Protocol:
       - Stratified 5-fold cross-validation with train/val/test splits (70/15/15)
       - Target metric: Macro F1-score >= 0.80 and Critical Class Recall >= 0.95
       - Deterministic safety overrides MUST remain active as a mandatory safeguard regardless of model score.
    """
    pass

