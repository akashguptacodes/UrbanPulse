from app.similarity.lexical import (
    extract_combined_text,
    calculate_lexical_similarity,
    tokenize,
)


def test_extract_combined_text():
    assert extract_combined_text("Large pothole", "Deep hole in middle of road") == "Large pothole. Deep hole in middle of road"
    assert extract_combined_text("Broken streetlight", "") == "Broken streetlight"
    assert extract_combined_text("Pothole", None) == "Pothole"


def test_identical_texts_maximum_score():
    text = "Severe deep pothole on Main Street near grocery store"
    sim = calculate_lexical_similarity(text, text)
    assert sim == 1.0


def test_similar_wording_high_score():
    t1 = "Large water-filled pothole near 5th avenue blocking traffic"
    t2 = "Deep pothole filled with water on 5th avenue causing traffic issues"
    sim = calculate_lexical_similarity(t1, t2)
    assert sim > 0.5


def test_completely_unrelated_texts_zero_score():
    t1 = "Fallen electric pole live wire spark fire hazard"
    t2 = "Overflowing plastic trash bins smelly garbage dump"
    sim = calculate_lexical_similarity(t1, t2)
    assert sim < 0.2


def test_empty_text_zero_score():
    assert calculate_lexical_similarity("", "Some valid text") == 0.0
    assert calculate_lexical_similarity("", "") == 0.0


def test_tokenize_stopwords_filtered():
    tokens = tokenize("This is the main road with a huge hole")
    assert "this" not in tokens
    assert "is" not in tokens
    assert "the" not in tokens
    assert "main" in tokens
    assert "road" in tokens
    assert "huge" in tokens
    assert "hole" in tokens

