import math
import hashlib
from abc import ABC, abstractmethod
from typing import List, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def vector_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two float vectors, bounded in [0.0, 1.0]."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    sim = dot_product / (norm1 * norm2)
    return round(max(0.0, min(1.0, sim)), 4)


class EmbeddingProvider(ABC):
    """Abstract interface for text embedding models."""

    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        pass

    def embed_text(self, text: str) -> List[float]:
        results = self.embed_texts([text])
        return results[0] if results else []


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic embedding provider for offline operation, unit tests, and CI.
    Generates 384-dimensional normalized vectors based on stable token and char n-gram hashing.
    Preserves exact identity (identical text -> identical vector) and produces non-zero
    similarity for overlapping vocabularies.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        embeddings: List[List[float]] = []
        for text in texts:
            clean = (text or "").strip().lower()
            if not clean:
                embeddings.append([0.0] * self.dim)
                continue

            # Deterministic projection vector using hash bins
            vec = [0.0] * self.dim
            words = clean.split()
            for word in words:
                h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dim
                sign = 1.0 if ((h >> 8) % 2 == 0) else -1.0
                vec[idx] += sign

            # Also add character 3-gram features for subword similarity
            for i in range(len(clean) - 2):
                gram = clean[i : i + 3]
                h = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dim
                sign = 1.0 if ((h >> 4) % 2 == 0) else -1.0
                vec[idx] += 0.5 * sign

            # L2 normalize
            norm = math.sqrt(sum(v * v for v in vec))
            if norm > 0.0:
                vec = [v / norm for v in vec]
            embeddings.append(vec)

        return embeddings


class SentenceTransformerProvider(EmbeddingProvider):
    """Real Sentence Transformers provider using all-MiniLM-L6-v2."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer  # type: ignore

                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.warning(
                    f"SentenceTransformer model '{self.model_name}' could not be loaded: {e}. "
                    f"Falling back to MockEmbeddingProvider."
                )
                self._model = MockEmbeddingProvider()
        return self._model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        model = self._get_model()
        if isinstance(model, MockEmbeddingProvider):
            return model.embed_texts(texts)

        # SentenceTransformer encode
        embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return [vec.tolist() for vec in embeddings]


_current_provider: Optional[EmbeddingProvider] = None


def get_embedding_provider() -> EmbeddingProvider:
    """Retrieve the active embedding provider singleton."""
    global _current_provider
    if _current_provider is None:
        if settings.USE_MOCK_EMBEDDINGS:
            _current_provider = MockEmbeddingProvider()
        else:
            try:
                import sentence_transformers  # noqa: F401
                _current_provider = SentenceTransformerProvider(settings.EMBEDDING_MODEL_NAME)
            except ImportError:
                _current_provider = MockEmbeddingProvider()
    return _current_provider


def set_embedding_provider(provider: Optional[EmbeddingProvider]) -> None:
    """Explicitly set or reset the embedding provider (useful for testing)."""
    global _current_provider
    _current_provider = provider

