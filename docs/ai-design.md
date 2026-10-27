# UrbanPulse — AI Architecture & Decision Systems Design
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. AI Vision, Philosophy & Guiding Principles

UrbanPulse leverages artificial intelligence to assist human decision-making, not replace it. Civic issues directly impact public safety, infrastructure allocation, and municipal accountability. Therefore, the AI design adheres strictly to three foundational tenets:

1. **Explainability Over Black-Box Complexity:** Every duplicate recommendation and priority score must be traceable to concrete factors (geographic distance, lexical overlap, semantic alignment, and extracted risk keywords).
2. **Human-in-the-Loop (Advisory AI):** The system **never** performs automatic complaint merging, status transitions, or complaint rejections. AI outputs are advisory recommendations presented to municipal administrators for validation.
3. **Local-First & Cost-Free Architecture:** All AI inference runs locally on standard CPU hardware using lightweight open-source models and deterministic rule engines. No paid third-party AI APIs (e.g. OpenAI, Anthropic) or GPU hardware are required.
4. **Strict Scope Limitation on Photos:** Computer vision models (CNNs, Vision Transformers, image classifiers, visual similarity) are **strictly out of scope**. Photographic attachments serve solely as human evidence for administrative review.

---

## 2. Multi-Signal Duplicate Complaint Detection System

Duplicate complaints frequently occur when multiple residents report the same localized incident (such as a major pothole or overflowing trash bin). Identifying duplicates prevents duplicate work-order dispatches while aggregating citizen reports.

Duplicate detection operates across three complementary signals combined into a single composite score:

```
+-----------------------------------------------------------------------------------+
|                            TARGET COMPLAINT & CANDIDATE POOL                      |
+-----------------------------------------------------------------------------------+
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   [Signal A: Geographic]        [Signal B: Lexical]           [Signal C: Semantic]
     Haversine Distance             TF-IDF Cosine            Sentence-Transformers
            │                             │                             │
            ▼                             ▼                             ▼
      Geo Score S_geo              Lexical Score S_lex           Semantic Score S_sem
      (0.0000 - 1.0000)             (0.0000 - 1.0000)             (0.0000 - 1.0000)
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          │
                                          ▼
                         [Signal D: Weighted Combiner]
                 S_comb = (0.40 * S_geo) + (0.20 * S_lex) + (0.40 * S_sem)
                                          │
                                          ▼
                      [Decision Bands & Human Explanation]
                       - >= 0.75: POSSIBLE_DUPLICATE (High)
                       - 0.50 - 0.74: REVIEW_SUGGESTED (Moderate)
                       - < 0.50: UNLIKELY_DUPLICATE
```

---

### 2.1 Candidate Pool Retrieval & Pre-Filtering
Before evaluating expensive NLP computations, the backend pre-filters candidate complaints from the database using two fast SQL constraints:
1. **Primary Category Exact Match:** Complaints across different categories (e.g., `POTHOLES` vs `STREET_LIGHTS`) are never considered duplicates.
2. **Geographic Bounding Box:** Only complaints within a maximum radius $R_{\text{max}}$ (default: 150 meters for urban issues; 500 meters for disasters) are retrieved for AI evaluation.

---

### 2.2 Signal A: Geographic Proximity (Haversine Formula)

#### Mathematical Formula
Given target coordinates $(\phi_1, \lambda_1)$ and candidate coordinates $(\phi_2, \lambda_2)$ in radians:
$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
where $R \approx 6{,}371{,}000\text{ meters}$ (Earth radius).

#### Score Normalization
The geographic distance $d$ (meters) is mapped to a normalized score $S_{\text{geo}} \in [0, 1]$:
$$S_{\text{geo}} = \max\left(0, 1 - \frac{d}{d_{\text{max}}}\right)$$
Where $d_{\text{max}}$ is the configurable category distance horizon:
- `POTHOLES`: $d_{\text{max}} = 100\text{ meters}$
- `GARBAGE`: $d_{\text{max}} = 150\text{ meters}$
- `STREET_LIGHTS`: $d_{\text{max}} = 100\text{ meters}$
- `DISASTERS`: $d_{\text{max}} = 500\text{ meters}$

*Edge Cases:*
- If $d = 0$ meters (exact same coordinates), $S_{\text{geo}} = 1.0$.
- If $d \ge d_{\text{max}}$, $S_{\text{geo}} = 0.0$.
- Invalid coordinates outside range $[-90, +90]$ and $[-180, +180]$ are rejected at the API validation layer.

---

### 2.3 Signal B: Lexical Similarity (TF-IDF Vectorization)

#### Preprocessing Pipeline
1. Text normalization: Lowercasing, removal of punctuation, URL stripping.
2. Tokenization and stop-word filtering using standard English stop-words.
3. Sublinear TF scaling ($\text{tf} = 1 + \log(\text{count})$) and inverse document frequency (IDF) weighting.

#### Comparison
The target complaint description and candidate complaint description are vectorized into sparse vectors $\mathbf{u}$ and $\mathbf{v}$. Similarity is calculated via cosine similarity:
$$S_{\text{lex}} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$

*Short/Empty Text Handling:*
- If a description is shorter than 3 tokens or contains only uninformative characters, $S_{\text{lex}}$ defaults to $0.0$, and the combined scoring engine shifts reliance to geographic proximity and semantic embeddings.

---

### 2.4 Signal C: Semantic Similarity (Sentence Transformers)

#### Model Selection: `all-MiniLM-L6-v2`
The platform selects the open-source model **`sentence-transformers/all-MiniLM-L6-v2`** based on the following engineering trade-offs:
- **Footprint & Memory:** Model disk footprint is only ~80 MB; consumes under 250 MB of RAM during runtime.
- **Inference Speed:** Average CPU inference latency is $\sim 15\text{ms}$ per description on standard x86_64 processors.
- **Language Capability:** Trained on over 1 billion sentence pairs; robust handling of colloquial phrasing, typos, and synonyms (e.g., equating "road crater" with "broken asphalt pothole").
- **Cost & Dependencies:** Free, Apache 2.0 license, runs completely locally without external cloud dependencies.

#### Embedding & Cosine Computation
The model generates 384-dimensional dense vectors $\mathbf{e}_1$ and $\mathbf{e}_2$ for the target and candidate descriptions:
$$S_{\text{sem}} = \frac{\mathbf{e}_1 \cdot \mathbf{e}_2}{\|\mathbf{e}_1\| \|\mathbf{e}_2\|}$$

---

### 2.5 Signal D: Combined Decision & Provisional Thresholds

The signals are combined via a weighted linear combination:
$$S_{\text{combined}} = w_{\text{geo}} \cdot S_{\text{geo}} + w_{\text{lex}} \cdot S_{\text{lex}} + w_{\text{sem}} \cdot S_{\text{sem}}$$

#### Provisional Weight Configuration
> [!IMPORTANT]
> These weights are provisional initial estimates for Sprint 0. They will be validated and calibrated against labeled municipal datasets during Sprint 8:
- $w_{\text{geo}} = 0.40$ (Geographic proximity is the strongest indicator in civic infrastructure)
- $w_{\text{sem}} = 0.40$ (Semantic meaning captures true intent despite divergent phrasing)
- $w_{\text{lex}} = 0.20$ (Lexical overlap provides exact keyword verification)
- Note: $\sum w = 1.00$.

#### Decision Bands
| Combined Score $S_{\text{combined}}$ | Recommendation Key | System Action & UI Presentation |
| :--- | :--- | :--- |
| $\ge 0.75$ | `POSSIBLE_DUPLICATE` (High Confidence) | Highlighting in triage UI; primary candidate suggested for administrative link. |
| $0.50 \le S_{\text{combined}} < 0.75$ | `POSSIBLE_DUPLICATE` (Moderate Confidence) | Flagged with warning badge; presented to administrator as possible match. |
| $< 0.50$ | `UNLIKELY_DUPLICATE` | Not presented as candidate, or ranked at bottom of candidate list. |

#### Risk Analysis & Mitigation
- **False Positives (Distinct issues flagged as duplicates):** E.g., two distinct potholes on opposite sides of a large boulevard. *Mitigation:* The system **never** auto-merges; administrators must inspect both complaints and side-by-side coordinates on a map before approving a duplicate link.
- **False Negatives (Real duplicates missed):** E.g., one citizen writes "deep crater" and another provides a one-word description "hole". *Mitigation:* High geographic proximity ($w_{\text{geo}} = 0.40$) ensures candidate complaints within 25m are surfaced even with sparse text.

---

## 3. Severity and Priority Assessment Engine

The priority engine calculates an objective urgency score ($0 \dots 100$) and assigns complaints to an operational priority band (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

### 3.1 Severity Information Extraction
The engine parses the citizen description and category metadata to extract five distinct risk dimensions:

| Risk Dimension | Extraction Mechanism | High-Risk Indicators & Keywords |
| :--- | :--- | :--- |
| **Safety Hazards** | Regex & lemmatized term matching | `sparking`, `live wire`, `exposed cable`, `open manhole`, `gas leak`, `smoke`, `fire`, `sinkhole`, `falling debris` |
| **Imminent Danger** | Pattern & context detection | `emergency`, `danger`, `collapsed`, `trapped`, `injury`, `hazard to life`, `severe threat` |
| **Damage Extent** | Magnitude & dimension parsing | `deep`, `massive`, `entire street`, `both lanes blocked`, `flooded road`, `water rising` |
| **Public Infrastructure Impact** | Location & transit keywords | `school`, `hospital`, `arterial road`, `bus route`, `crosswalk`, `elderly`, `pedestrian zone` |
| **Time Sensitivity** | Urgency phrases | `spreading`, `rapidly increasing`, `continuous spark`, `overflowing now` |

*Transparency Rule:* The administrative interface visually separates the literal citizen description from the AI-extracted risk factors. Inferred factors are tagged as "Inferred by AI System".

---

### 3.2 Scoring Model & Mathematical Formulation

The base priority score $P_{\text{raw}}$ is computed as:
$$P_{\text{raw}} = B_{\text{category}} + F_{\text{safety}} + F_{\text{impact}} + F_{\text{damage}} + F_{\text{urgency}}$$

#### 1. Category Base Weight ($B_{\text{category}}$)
- `DISASTERS`: 50 points
- `POTHOLES`: 20 points
- `STREET_LIGHTS`: 15 points
- `GARBAGE`: 15 points

#### 2. Risk Factor Contributions ($F_x$)
- **Safety Hazards ($F_{\text{safety}}$):** Up to $+35$ points (e.g., open manhole: $+25$, live electrical wires: $+35$).
- **Public Impact ($F_{\text{impact}}$):** Up to $+20$ points (near school/hospital: $+15$, major intersection/road: $+10$).
- **Damage Extent ($F_{\text{damage}}$):** Up to $+15$ points (entire lane impassable: $+15$, minor crack: $+0$).
- **Time Sensitivity ($F_{\text{urgency}}$):** Up to $+10$ points (active expansion: $+10$).

#### Normalization
$$P = \min\left(100.0, \max\left(0.0, P_{\text{raw}}\right)\right)$$

---

### 3.3 Priority Bands & Provisional Thresholds

| Priority Score Range | Priority Band | Recommended Municipal SLA / Target |
| :--- | :--- | :--- |
| $85.0 \dots 100.0$ | `CRITICAL` | Immediate dispatch (Target response $< 2$ hours) |
| $60.0 \dots 84.9$ | `HIGH` | Urgent inspection (Target response $< 12$ hours) |
| $30.0 \dots 59.9$ | `MEDIUM` | Standard maintenance queue (Target response $< 48$ hours) |
| $0.0 \dots 29.9$ | `LOW` | Routine civic upkeep (Target response $< 5$ days) |

---

### 3.4 Deterministic Safety Overrides & Emergency Guidance

#### 1. Immediate Safety Override Rules
Regardless of statistical text scores or category defaults, if any of the following deterministic rules trigger, the priority is forced to **`CRITICAL`** with `safety_override = true`:
- Category is `DISASTERS` with `disaster_type == 'FIRE'`.
- Category is `DISASTERS` with `disaster_type == 'FLOOD'` and water rising/blocked route keywords.
- Text contains confirmed high-voltage electrical hazard terms (`live wire`, `sparking transformer`, `arcing cable`).
- Text reports structural bridge or building collapse.

#### 2. Emergency Guidance Disclaimer
> [!CAUTION]
> **UrbanPulse is NOT a 911/112 emergency response system.**
> When a citizen selects `DISASTERS` or when safety override keywords are detected in the frontend submission form, an unblockable emergency banner is displayed immediately:
> *"If you or others are in immediate physical danger, call emergency services (911 / 112) immediately. Do not rely on web submissions for urgent life-safety rescue."*

---

### 3.5 Future Machine Learning Roadmap (Post-Sprint 9)

In the current scope (Sprints 0–9), priority scoring is deliberately implemented using transparent, rule-based algorithms. 

Transitioning to supervised tabular models (such as **Random Forest** or **XGBoost**) will only be considered when:
1. At least 1,500 historical complaints with human administrator priority labels have been accumulated.
2. An offline cross-validation demonstrates statistically superior agreement ($>15\%$ improvement in F1-score) over rule-based scoring without compromising emergency recall.
3. Feature importance scores can be extracted cleanly to maintain human explainability.
