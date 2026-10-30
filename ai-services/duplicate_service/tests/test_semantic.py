from app.similarity.semantic import (
    MockEmbeddingProvider,
    vector_cosine_similarity,
    set_embedding_provider,
    get_embedding_provider,
)


def test_mock_embedding_provider_shape():
    provider = MockEmbeddingProvider(dim=384)
    embeddings = provider.embed_texts(["Pothole on 1st avenue", "Streetlight not working"])
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384
    assert len(embeddings[1]) == 384


def test_mock_embedding_identical_texts():
    provider = MockEmbeddingProvider()
    e1 = provider.embed_text("Severe water leakage on crossroad")
    e2 = provider.embed_text("Severe water leakage on crossroad")
    sim = vector_cosine_similarity(e1, e2)
    assert sim == 1.0


def test_vector_cosine_orthogonal_or_empty():
    assert vector_cosine_similarity([], []) == 0.0
    assert vector_cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert vector_cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0


def test_embedding_provider_override():
    custom_mock = MockEmbeddingProvider(dim=128)
    set_embedding_provider(custom_mock)
    assert get_embedding_provider() is custom_mock
    # Reset back to None to use default
    set_embedding_provider(None)

