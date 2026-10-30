# UrbanPulse — Duplicate Detection Service

FastAPI-powered microservice responsible for detecting duplicate civic complaints across multi-signal algorithms (geographic distance decay, lexical similarity, and semantic text similarity) with strict category compatibility rules.

> **Sprint 5 Status:** Complete, explainable, testable AI service implementing multi-signal duplicate detection without external dependencies or heavy model downloads required for tests.

---

## 1. Overview & Architecture

The service provides a stateless evaluation pipeline that compares a target civic complaint against a bounded candidate pool (up to 100 candidates).

### Multi-Signal Scoring

Combined duplicate score:
$$S_{\text{combined}} = w_{\text{geo}} \cdot S_{\text{geo}} + w_{\text{lex}} \cdot S_{\text{lex}} + w_{\text{sem}} \cdot S_{\text{sem}}$$

- **Geographic Distance Decay ($w_{\text{geo}} = 0.40$):**
  Uses the Haversine formula to compute great-circle distance $d$ in meters.
  Linear decay formula:
  $$S_{\text{geo}} = \max\left(0.0, 1.0 - \frac{d}{d_{\text{horizon}}}\right)$$
  Category horizons:
  - `POTHOLES`: 100m
  - `STREET_LIGHTS`: 100m
  - `GARBAGE`: 150m
  - `DISASTERS`: 500m
  - Custom override via request `max_distance_meters`
- **Lexical Similarity ($w_{\text{lex}} = 0.20$):**
  Sublinear TF-IDF ($1 + \log(\text{tf})$) cosine similarity over normalized `title` + `description` tokens with English stop-words removed.
- **Semantic Similarity ($w_{\text{sem}} = 0.40$):**
  Dense vector representations via Sentence Transformers (`all-MiniLM-L6-v2`) with normalized cosine similarity. Includes a deterministic `MockEmbeddingProvider` for 100% offline testing.
- **Category Compatibility Constraint:**
  Complaints with mismatched categories or mismatched disaster subtypes (`FIRE` vs `FLOOD`) are immediately assigned a combined score of $0.0$ and marked `UNLIKELY_DUPLICATE`.
- **Tie-Breaking Order:**
  Candidate matches are deterministically sorted by:
  1. `combined_score` descending
  2. `distance_meters` ascending
  3. `candidate_id` ascending

### Decision Recommendations

| Recommendation | Score Threshold | Meaning |
|---|---|---|
| `LIKELY_DUPLICATE` | $\ge 0.75$ | High-confidence duplicate flag for reviewer |
| `POSSIBLE_DUPLICATE` | $0.50 \le \text{score} < 0.75$ | Moderate similarity candidate for inspection |
| `UNLIKELY_DUPLICATE` | $< 0.50$ | Distinct civic issue |

> **Safety Guarantee:** The service is strictly advisory. It never automatically merges, modifies, or deletes complaints.

---

## 2. API Endpoints

### Health Check
`GET /health`
```json
{
  "status": "ok",
  "service": "duplicate_service",
  "version": "0.1.0",
  "environment": "development",
  "model": "all-MiniLM-L6-v2"
}
```

### Duplicate Evaluation
`POST /api/v1/duplicates/evaluate` (alias: `POST /api/v1/duplicates/check`)

**Request:**
```json
{
  "target_complaint": {
    "id": "complaint-101",
    "title": "Deep pothole near 5th cross",
    "description": "Hazardous road crater damaging cars",
    "category": "POTHOLES",
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "candidate_pool": [
    {
      "id": "complaint-099",
      "title": "Large pothole in street",
      "description": "Crater in middle lane near 5th cross",
      "category": "POTHOLES",
      "latitude": 12.9717,
      "longitude": 77.5947
    }
  ],
  "max_distance_meters": 150.0
}
```

**Response:**
```json
{
  "target_id": "complaint-101",
  "candidates_evaluated": 1,
  "matches": [
    {
      "candidate_id": "complaint-099",
      "combined_score": 0.8654,
      "recommendation": "LIKELY_DUPLICATE",
      "distance_meters": 15.32,
      "geo_score": 0.8979,
      "lexical_score": 0.7250,
      "semantic_score": 0.8800,
      "reason_codes": [
        "HIGH_GEO_PROXIMITY",
        "STRONG_LEXICAL_OVERLAP",
        "STRONG_SEMANTIC_MATCH",
        "HIGH_CONFIDENCE_DUPLICATE"
      ],
      "explanation": "Evaluated at 15.3m distance (geo score: 0.90), lexical similarity: 0.72, semantic similarity: 0.88. Classified as LIKELY_DUPLICATE."
    }
  ],
  "top_match": {
    "candidate_id": "complaint-099",
    "combined_score": 0.8654,
    "recommendation": "LIKELY_DUPLICATE",
    "distance_meters": 15.32,
    "geo_score": 0.8979,
    "lexical_score": 0.7250,
    "semantic_score": 0.8800,
    "reason_codes": [
      "HIGH_GEO_PROXIMITY",
      "STRONG_LEXICAL_OVERLAP",
      "STRONG_SEMANTIC_MATCH",
      "HIGH_CONFIDENCE_DUPLICATE"
    ],
    "explanation": "Evaluated at 15.3m distance (geo score: 0.90), lexical similarity: 0.72, semantic similarity: 0.88. Classified as LIKELY_DUPLICATE."
  }
}
```

---

## 3. Running & Testing

### Run Tests
```powershell
.\venv\Scripts\pytest
```

All 32 test cases execute offline in under 1 second without downloading external model weights.

### Run Service
```powershell
.\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
