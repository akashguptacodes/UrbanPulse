import os
import json
import logging
from typing import Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_MODEL_FILE = ARTIFACT_DIR / "priority_xgb.json"

class XGBoostPriorityModel:
    """
    Singleton wrapper for the trained XGBoost priority scoring model.
    Provides fast, in-memory inference and safe fallback if the model file is not present.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or DEFAULT_MODEL_FILE
        self._booster = None
        self._is_loaded = False
        self._load_model()

    def _load_model(self) -> None:
        if not self.model_path.exists():
            logger.info(f"XGBoost model file not found at {self.model_path}. Service will use baseline rules.")
            return

        try:
            import xgboost as xgb
            self._booster = xgb.Booster()
            self._booster.load_model(str(self.model_path))
            self._is_loaded = True
            logger.info(f"Successfully loaded XGBoost model from {self.model_path}")
        except Exception as e:
            logger.warning(f"Failed to load XGBoost model from {self.model_path}: {e}")
            self._booster = None
            self._is_loaded = False

    @property
    def is_ready(self) -> bool:
        return self._is_loaded and self._booster is not None

    def predict_score(self, feature_vector: List[float]) -> Optional[float]:
        """
        Runs inference on a single feature vector.
        Returns predicted severity score in [0.0, 100.0] or None if model unavailable.
        """
        if not self.is_ready:
            return None

        try:
            import xgboost as xgb
            from app.features.extractor import FeatureExtractor

            dmatrix = xgb.DMatrix([feature_vector], feature_names=FeatureExtractor.feature_names())
            raw_pred = self._booster.predict(dmatrix)
            score = float(raw_pred[0])
            # Bound prediction strictly within [0.0, 100.0]
            return round(max(0.0, min(100.0, score)), 1)
        except Exception as e:
            logger.error(f"XGBoost inference error: {e}")
            return None

# Global singleton
xgb_priority_model = XGBoostPriorityModel()

