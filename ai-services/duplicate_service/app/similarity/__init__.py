from app.similarity.geographic import (
    calculate_haversine_distance,
    calculate_geographic_score,
    get_category_horizon,
)
from app.similarity.category import check_category_compatibility
from app.similarity.lexical import (
    extract_combined_text,
    calculate_lexical_similarity,
)
from app.similarity.semantic import (
    EmbeddingProvider,
    MockEmbeddingProvider,
    SentenceTransformerProvider,
    get_embedding_provider,
    set_embedding_provider,
    vector_cosine_similarity,
)

__all__ = [
    "calculate_haversine_distance",
    "calculate_geographic_score",
    "get_category_horizon",
    "check_category_compatibility",
    "extract_combined_text",
    "calculate_lexical_similarity",
    "EmbeddingProvider",
    "MockEmbeddingProvider",
    "SentenceTransformerProvider",
    "get_embedding_provider",
    "set_embedding_provider",
    "vector_cosine_similarity",
]

