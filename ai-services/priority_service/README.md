# UrbanPulse — Priority Assessment Service

FastAPI-powered microservice responsible for civic complaint severity extraction, multi-factor priority scoring, and deterministic emergency safety overrides.

> **Sprint 6 Status:** Complete, explainable, testable decision-support service implementing NLP indicator extraction with negation handling, bounded severity scoring, and deterministic safety overrides.

---

## 1. Overview & Architecture

The Priority Assessment Service is an **explainable decision-support tool** designed to assist municipal administrators in triaging civic issues. It does not replace human administrators, does not autonomously close or reject complaints, and does not contact emergency services.

### Core Modules

- `app/schemas/priority.py`: Pydantic request/response schemas with category, subtype, and text validations.
- `app/extraction/negation.py`: Deterministic sliding-window negation detection and clause boundary parsing.
- `app/extraction/indicators.py`: Grouped severity indicator dictionary covering 5 risk dimensions.
- `app/safety_rules/rules.py`: Deterministic safety overrides that enforce `CRITICAL` priority for immediate hazards.
- `app/scoring/engine.py`: Category baseline scoring, factor accumulation, bounding (0–100), and priority mapping.
- `app/models/interface.py`: Pluggable model interface and specification for future supervised models.
- `app/api/priority.py`: REST endpoint `POST /api/v1/priority/assess`.
- `app/api/health.py`: Health readiness endpoint `GET /health`.

---

## 2. Multi-Factor Scoring Pipeline

### Raw Score Formula
$$P_{\text{raw}} = B_{\text{category}} + F_{\text{safety}} + F_{\text{impact}} + F_{\text{damage}} + F_{\text{urgency}}$$

Bounded final score:
$$P = \min\left(100.0, \max\left(0.0, P_{\text{raw}}\right)\right)$$

### 1. Category Base Weight ($B_{\text{category}}$)
- `DISASTERS`: 50 points
- `POTHOLES`: 20 points
- `STREET_LIGHTS`: 15 points
- `GARBAGE`: 15 points

### 2. Dimension Contributions ($F_x$) with Caps
- **Safety Hazards & Imminent Danger ($F_{\text{safety}}$):** Capped at $+35.0$ points (e.g., live wire: $+35$, open manhole: $+25$, active fire: $+35$).
- **Public Impact ($F_{\text{impact}}$):** Capped at $+20.0$ points (near hospital: $+15$, school: $+15$, major crosswalk: $+10$).
- **Damage Extent ($F_{\text{damage}}$):** Capped at $+15.0$ points (road impassable: $+15$, deep crater: $+15$, multiple lights out: $+10$).
- **Time Sensitivity ($F_{\text{urgency}}$):** Capped at $+10.0$ points (water rising rapidly: $+10$, continuous spark: $+10$).

### 3. Negation Handling
Indicators in negated scopes (e.g., *"there is no active fire"*, *"no exposed wire"*, *"fire is extinguished"*) are detected by the negation engine and awarded **`0.0` points**, preventing false-positive hazard escalations. Clause boundaries (e.g. *"no traffic, but live wire is sparking"*) isolate negation to the appropriate clause.

### 4. Operational Priority Bands

| Priority Band | Score Range | Operational Meaning |
|---|---|---|
| **`LOW`** | $0.0 \dots 24.9$ | Routine civic upkeep |
| **`MEDIUM`** | $25.0 \dots 49.9$ | Standard maintenance queue |
| **`HIGH`** | $50.0 \dots 74.9$ | Urgent inspection |
| **`CRITICAL`** | $75.0 \dots 100.0$ | Immediate municipal attention |

---

## 3. Deterministic Safety Overrides

If any of the following immediate danger rules trigger affirmatively (non-negated), the score is elevated to at least **`90.0`** and the priority is forced to **`CRITICAL`**:

- **`SAFETY_OVERRIDE_ACTIVE_FIRE`**: Active flames, burning structure, or explosion reported.
- **`SAFETY_OVERRIDE_ELECTRICAL_HAZARD`**: Live wire, sparking transformer, or arcing cable.
- **`SAFETY_OVERRIDE_STRUCTURAL_COLLAPSE`**: Building, bridge, or roadway structural collapse.
- **`SAFETY_OVERRIDE_LIFE_HAZARD`**: Direct report of trapped persons or immediate threat to human life.
- **`SAFETY_OVERRIDE_SEVERE_FLOOD`**: Rapidly rising water, submerged streets, or impassable flood conditions.

> **Safety Disclaimer:** UrbanPulse is a municipal decision-support system. It does NOT dispatch 911/112 emergency services. If citizens report life-threatening emergencies, frontend banners direct them to call 911 / 112 immediately.

---

## 4. API Endpoints

### Health Check
`GET /health`
```json
{
  "status": "ok",
  "service": "priority_service",
  "version": "0.1.0",
  "environment": "development",
  "rule_version": "rules-v1.0.0",
  "assessment_method": "RULE_BASED_BASELINE"
}
```

### Priority Assessment
`POST /api/v1/priority/assess`

**Request:**
```json
{
  "complaint_id": "c-901",
  "primary_category": "STREET_LIGHTS",
  "title": "Broken light pole after storm",
  "description": "Fallen pole with live wire sparking violently near crosswalk and school."
}
```

**Response:**
```json
{
  "complaint_id": "c-901",
  "severity_score": 90.0,
  "priority_level": "CRITICAL",
  "safety_override_applied": true,
  "safety_reasons": ["SAFETY_OVERRIDE_ELECTRICAL_HAZARD"],
  "human_review_recommended": true,
  "detected_indicators": [
    {
      "dimension": "SAFETY_HAZARD",
      "matched_phrase": "live wire",
      "severity_contribution": 35.0,
      "is_negated": false,
      "context_snippet": "pole with live wire sparking viol"
    },
    {
      "dimension": "PUBLIC_IMPACT",
      "matched_phrase": "school",
      "severity_contribution": 15.0,
      "is_negated": false,
      "context_snippet": "crosswalk and school."
    }
  ],
  "score_breakdown": {
    "base_category_score": 15.0,
    "safety_hazards_contribution": 35.0,
    "public_impact_contribution": 20.0,
    "damage_extent_contribution": 0.0,
    "urgency_contribution": 0.0,
    "raw_score": 70.0,
    "final_score": 90.0
  },
  "assessment_method": "RULE_BASED_BASELINE",
  "rule_version": "rules-v1.0.0",
  "explanation": "CRITICAL SAFETY OVERRIDE TRIGGERED (SAFETY_OVERRIDE_ELECTRICAL_HAZARD). Immediate human inspection recommended. Disclaimer: UrbanPulse is a decision-support tool and does not dispatch emergency responders directly.",
  "limitations": "Decision-support estimate based on citizen-reported text and metadata. Does not verify real-world conditions or contact emergency services."
}
```

---

## 5. Supervised Model Roadmap (Post-Sprint 9)

Currently, the service utilizes a transparent, rule-based NLP baseline (`RULE_BASED_BASELINE`). 
Per architectural decision records (ADR-007), supervised tabular models (**Random Forest** or **XGBoost**) will only be considered after:
1. At least 1,500 historical complaints with human administrator priority labels have been collected.
2. Cross-validation confirms a $>15\%$ improvement in Macro F1 without compromising emergency recall.
3. Feature importance can be extracted to maintain human explainability.
4. Deterministic safety overrides remain active regardless of model score.

---

## 6. Running & Testing

### Run Tests
```powershell
.\venv\Scripts\pytest
```

All 35 unit and API tests execute in under 1 second.

### Run Service
```powershell
.\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```
