from typing import List, Optional
from app.core.config import settings
from app.schemas.complaint import (
    ComplaintInput,
    ComplaintCategory,
    CandidateScoreDetail,
    DecisionRecommendation,
    DuplicateEvaluateResponse,
)
from app.similarity.category import check_category_compatibility
from app.similarity.geographic import (
    calculate_haversine_distance,
    calculate_geographic_score,
    get_category_horizon,
)
from app.similarity.lexical import (
    extract_combined_text,
    calculate_lexical_similarity,
)
from app.similarity.semantic import (
    EmbeddingProvider,
    get_embedding_provider,
    vector_cosine_similarity,
)
from app.retrieval.filter import filter_candidate_pool


def build_reason_codes_and_explanation(
    recommendation: DecisionRecommendation,
    distance_meters: float,
    geo_score: float,
    lex_score: float,
    sem_score: float,
    is_compatible: bool,
    cat_reason: str,
    is_hyper_local: bool = False,
) -> tuple[List[str], str]:
    """Generate explainable reason codes and clear human-readable rationale."""
    if not is_compatible:
        reason_code = "CATEGORY_MISMATCH" if "Category" in cat_reason else "DISASTER_SUBTYPE_MISMATCH"
        return [reason_code], f"Complaint disqualified as duplicate: {cat_reason}."

    reasons: List[str] = []

    # Geographic signals
    if is_hyper_local:
        reasons.append("HYPER_LOCAL_PROXIMITY_MATCH")

    if geo_score >= 0.8:
        reasons.append("HIGH_GEO_PROXIMITY")
    elif geo_score >= 0.4:
        reasons.append("MODERATE_GEO_PROXIMITY")
    elif geo_score == 0.0:
        reasons.append("OUTSIDE_GEO_HORIZON")

    # Lexical signals
    if lex_score >= 0.7:
        reasons.append("STRONG_LEXICAL_OVERLAP")
    elif lex_score >= 0.35:
        reasons.append("MODERATE_LEXICAL_OVERLAP")

    # Semantic signals
    if sem_score >= 0.75:
        reasons.append("STRONG_SEMANTIC_MATCH")
    elif sem_score >= 0.50:
        reasons.append("MODERATE_SEMANTIC_MATCH")

    # Confidence summary
    if recommendation == DecisionRecommendation.LIKELY_DUPLICATE:
        reasons.append("HIGH_CONFIDENCE_DUPLICATE")
    elif recommendation == DecisionRecommendation.POSSIBLE_DUPLICATE:
        reasons.append("POSSIBLE_SIMILAR_ISSUE")
    else:
        reasons.append("LOW_DUPLICATE_CONFIDENCE")

    if is_hyper_local and recommendation == DecisionRecommendation.POSSIBLE_DUPLICATE and (
        round((settings.GEO_WEIGHT * geo_score) + (settings.LEXICAL_WEIGHT * lex_score) + (settings.SEMANTIC_WEIGHT * sem_score), 4)
        < settings.THRESHOLD_POSSIBLE_DUPLICATE
    ):
        explanation = (
            f"Evaluated at {distance_meters:.1f}m distance (geo score: {geo_score:.2f}). "
            f"Hyper-local proximity (<= {settings.HYPER_LOCAL_DISTANCE_METERS:.0f}m) classified as POSSIBLE_DUPLICATE."
        )
    else:
        explanation = (
            f"Evaluated at {distance_meters:.1f}m distance (geo score: {geo_score:.2f}), "
            f"lexical similarity: {lex_score:.2f}, semantic similarity: {sem_score:.2f}. "
            f"Classified as {recommendation.value}."
        )
    return reasons, explanation


def evaluate_duplicates(
    target: ComplaintInput,
    candidates: List[ComplaintInput],
    max_distance_meters: Optional[float] = None,
    embedding_provider: Optional[EmbeddingProvider] = None,
) -> DuplicateEvaluateResponse:
    """
    Core duplicate evaluation pipeline:
    1. Filter candidates (remove self-match, enforce bounds).
    2. Batch-embed texts.
    3. Multi-signal scoring (geographic decay, lexical TF-IDF, semantic embeddings, category constraints).
    4. Deterministic sorting and explainable recommendations.
    """
    valid_candidates = filter_candidate_pool(target, candidates)

    if not valid_candidates:
        return DuplicateEvaluateResponse(
            target_id=target.id,
            candidates_evaluated=0,
            matches=[],
            top_match=None,
        )

    provider = embedding_provider or get_embedding_provider()
    horizon = get_category_horizon(target.category, max_distance_meters)

    target_text = extract_combined_text(target.title, target.description)
    candidate_texts = [extract_combined_text(c.title, c.description) for c in valid_candidates]

    # Batch embed target + candidates for semantic similarity
    all_texts = [target_text] + candidate_texts
    all_embeddings = provider.embed_texts(all_texts)
    target_embedding = all_embeddings[0]
    candidate_embeddings = all_embeddings[1:]

    matches: List[CandidateScoreDetail] = []

    for idx, candidate in enumerate(valid_candidates):
        cand_text = candidate_texts[idx]
        cand_embedding = candidate_embeddings[idx]

        # 1. Category compatibility
        is_compatible, cat_reason = check_category_compatibility(target, candidate)
        distance = calculate_haversine_distance(
            target.latitude, target.longitude, candidate.latitude, candidate.longitude
        )

        if not is_compatible:
            reasons, explanation = build_reason_codes_and_explanation(
                recommendation=DecisionRecommendation.UNLIKELY_DUPLICATE,
                distance_meters=distance,
                geo_score=0.0,
                lex_score=0.0,
                sem_score=0.0,
                is_compatible=False,
                cat_reason=cat_reason,
            )
            matches.append(
                CandidateScoreDetail(
                    candidate_id=candidate.id,
                    combined_score=0.0,
                    recommendation=DecisionRecommendation.UNLIKELY_DUPLICATE,
                    distance_meters=round(distance, 2),
                    geo_score=0.0,
                    lexical_score=0.0,
                    semantic_score=0.0,
                    reason_codes=reasons,
                    explanation=explanation,
                )
            )
            continue

        # 2. Multi-signal scores
        geo_score = calculate_geographic_score(distance, horizon)
        lex_score = calculate_lexical_similarity(target_text, cand_text, corpus_texts=candidate_texts)
        sem_score = vector_cosine_similarity(target_embedding, cand_embedding)

        # 3. Weighted combination
        combined_score = round(
            (settings.GEO_WEIGHT * geo_score)
            + (settings.LEXICAL_WEIGHT * lex_score)
            + (settings.SEMANTIC_WEIGHT * sem_score),
            4,
        )

        # 4. Recommendation categorization with Hyper-local Proximity Floor
        is_hyper_local = distance <= settings.HYPER_LOCAL_DISTANCE_METERS
        if combined_score >= settings.THRESHOLD_LIKELY_DUPLICATE:
            recommendation = DecisionRecommendation.LIKELY_DUPLICATE
        elif combined_score >= settings.THRESHOLD_POSSIBLE_DUPLICATE:
            recommendation = DecisionRecommendation.POSSIBLE_DUPLICATE
        elif is_hyper_local:
            # Hyper-local floor: compatible civic complaints within <= 15m are promoted to POSSIBLE_DUPLICATE
            recommendation = DecisionRecommendation.POSSIBLE_DUPLICATE
            combined_score = max(combined_score, settings.THRESHOLD_POSSIBLE_DUPLICATE)
        else:
            recommendation = DecisionRecommendation.UNLIKELY_DUPLICATE

        reasons, explanation = build_reason_codes_and_explanation(
            recommendation=recommendation,
            distance_meters=distance,
            geo_score=geo_score,
            lex_score=lex_score,
            sem_score=sem_score,
            is_compatible=True,
            cat_reason=cat_reason,
            is_hyper_local=is_hyper_local,
        )

        matches.append(
            CandidateScoreDetail(
                candidate_id=candidate.id,
                combined_score=combined_score,
                recommendation=recommendation,
                distance_meters=round(distance, 2),
                geo_score=geo_score,
                lexical_score=lex_score,
                semantic_score=sem_score,
                reason_codes=reasons,
                explanation=explanation,
            )
        )

    # 5. Deterministic tie-breaking:
    # Highest combined_score desc, lowest distance_meters asc, lowest candidate_id asc
    matches.sort(key=lambda m: (-m.combined_score, m.distance_meters, m.candidate_id))

    return DuplicateEvaluateResponse(
        target_id=target.id,
        candidates_evaluated=len(valid_candidates),
        matches=matches,
        top_match=matches[0] if matches else None,
    )
