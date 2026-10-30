import re
import math
from typing import Dict, List, Set, Tuple

# Built-in lightweight English stop words
STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
    "while", "who", "whom", "why", "will", "with", "would", "you", "your", "yours", "yourself",
}

TOKEN_PATTERN = re.compile(r"\b[a-zA-Z0-9_]{2,}\b")


def extract_combined_text(title: str, description: str = "") -> str:
    """Combine title and description into a clean unified representation."""
    desc = (description or "").strip()
    clean_title = (title or "").strip()
    if desc:
        return f"{clean_title}. {desc}"
    return clean_title


def tokenize(text: str, remove_stopwords: bool = True) -> List[str]:
    """Tokenize string into lowercase alphanumeric words, filtering out short tokens and stopwords."""
    if not text:
        return []
    tokens = TOKEN_PATTERN.findall(text.lower())
    if remove_stopwords:
        filtered = [t for t in tokens if t not in STOP_WORDS]
        return filtered if filtered else tokens  # Keep tokens if all were stopwords
    return tokens


def compute_tf(tokens: List[str], sublinear: bool = True) -> Dict[str, float]:
    """Compute term frequency (optionally sublinear 1 + log(tf))."""
    counts: Dict[str, int] = {}
    for token in tokens:
        counts[token] = counts.get(token, 0) + 1

    tf_dict: Dict[str, float] = {}
    for token, count in counts.items():
        if sublinear and count > 0:
            tf_dict[token] = 1.0 + math.log(count)
        else:
            tf_dict[token] = float(count)
    return tf_dict


def calculate_lexical_similarity(
    text1: str,
    text2: str,
    corpus_texts: List[str] = None,
) -> float:
    """
    Calculate lexical cosine similarity using sublinear TF-IDF.
    Pure-Python implementation that is fast, deterministic, and requires no external packages.
    """
    clean1 = (text1 or "").strip()
    clean2 = (text2 or "").strip()

    if not clean1 or not clean2:
        return 0.0

    if clean1.lower() == clean2.lower():
        return 1.0

    tokens1 = tokenize(clean1)
    tokens2 = tokenize(clean2)

    if not tokens1 or not tokens2:
        return 0.0

    # Build local vocabulary & document frequencies
    all_docs = [tokens1, tokens2]
    if corpus_texts:
        for t in corpus_texts:
            toks = tokenize(t)
            if toks:
                all_docs.append(toks)

    n_docs = len(all_docs)
    df_counts: Dict[str, int] = {}
    for doc in all_docs:
        unique_tokens = set(doc)
        for tok in unique_tokens:
            df_counts[tok] = df_counts.get(tok, 0) + 1

    # Compute TF-IDF vectors for doc1 and doc2
    tf1 = compute_tf(tokens1, sublinear=True)
    tf2 = compute_tf(tokens2, sublinear=True)

    vec1: Dict[str, float] = {}
    for tok, tf_val in tf1.items():
        df_val = df_counts.get(tok, 1)
        idf = math.log((1.0 + n_docs) / (1.0 + df_val)) + 1.0
        vec1[tok] = tf_val * idf

    vec2: Dict[str, float] = {}
    for tok, tf_val in tf2.items():
        df_val = df_counts.get(tok, 1)
        idf = math.log((1.0 + n_docs) / (1.0 + df_val)) + 1.0
        vec2[tok] = tf_val * idf

    # Compute cosine similarity
    dot_product = sum(vec1[tok] * vec2[tok] for tok in vec1 if tok in vec2)
    norm1 = math.sqrt(sum(v * v for v in vec1.values()))
    norm2 = math.sqrt(sum(v * v for v in vec2.values()))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    sim = dot_product / (norm1 * norm2)
    return round(max(0.0, min(1.0, sim)), 4)

