# AI Services Summary: Duplicate & Priority Services

---

## 1. Duplicate Detection Service (Port 8001)

### What Algorithms Are Used?
1. **Haversine Distance + Cosine Decay Curve**: Calculates real-world geographic distance between complaints and maps it to a similarity score (1.0 = same spot, 0.0 = beyond search limit).
2. **Character & Token n-gram Jaccard / Levenshtein Ratio**: Measures lexical overlap and spelling similarity between complaint titles and descriptions.
3. **Sentence-BERT (`all-MiniLM-L6-v2`) Cosine Vector Similarity**: Generates 384-dimensional dense text embeddings to detect semantic similarity (even if completely different words are used).
4. **Category & Subtype Compatibility Filter**: Ensures only matching categories (and disaster sub-types) can be marked as duplicates.

### What Thresholds Are Used?
* **Signal Weights (Sum = 1.0):**
  * Geographic: **40%** (`0.40`)
  * Semantic: **40%** (`0.40`)
  * Lexical: **20%** (`0.20`)
* **Decision Bands:**
  * **$\ge 0.75$**: `LIKELY_DUPLICATE` (High confidence duplicate)
  * **$0.50$ to $0.74$**: `POSSIBLE_DUPLICATE` (Potential duplicate / related)
  * **$< 0.50$**: `UNLIKELY_DUPLICATE` (Distinct issue)
* **Hyper-Local Proximity Rule ($\le 15$ meters):**
  * If distance $\le 15\text{m}$ and category matches, similarity is boosted to at least **$0.50$** (`POSSIBLE_DUPLICATE`).
* **Category Distance Search Limits:**
  * Potholes: **100 meters**
  * Street Lights: **100 meters**
  * Garbage: **150 meters**
  * Disasters: **500 meters**

### How It Is Used:
1. When a complaint is submitted, existing nearby complaints in the same category are retrieved.
2. The engine computes the 3 scores ($S_{\text{geo}}, S_{\text{lex}}, S_{\text{sem}}$) and calculates:
   $$\text{Final Score} = (0.40 \times S_{\text{geo}}) + (0.20 \times S_{\text{lex}}) + (0.40 \times S_{\text{sem}})$$
3. If distance is $\le 15\text{m}$, the score is promoted to at least $0.50$.
4. If score is $\ge 0.50$, the complaint is marked as duplicate (`is_duplicate = true`) and linked to the original complaint (`parent_complaint_id`). If not, it becomes the original root complaint.

---

## 2. Priority Assessment Service (Port 8002)

### What Algorithms Are Used?
1. **Category Baseline Additive Model**: Sets an initial baseline severity score based on the category.
2. **Regex & Keyword Pattern Matcher**: Scans title and description for specific indicator phrases across 4 risk dimensions.
3. **Context-Aware Negation Filter (Sliding Window)**: Checks 4 words prior to each keyword for negation terms (`"not"`, `"no"`, `"never"`, `"resolved"`, `"fixed"`) so negated phrases do not add risk points.
4. **Deterministic Safety Override Engine**: Hardcoded safety rules that escalate high-consequence life/infrastructure risks directly to maximum severity.

### What Thresholds Are Used?
* **Category Base Scores (out of 100):**
  * Disasters: **50 points**
  * Potholes: **20 points**
  * Street Lights: **15 points**
  * Garbage: **15 points**
* **Factor Contribution Maximum Caps:**
  * Safety Hazard: max **+35 points**
  * Public Impact: max **+20 points**
  * Damage Extent: max **+15 points**
  * Urgency / Time Sensitivity: max **+10 points**
* **Priority Bands (Total Score 0 – 100):**
  * **$0.0 - 24.9$**: `LOW`
  * **$25.0 - 49.9$**: `MEDIUM`
  * **$50.0 - 74.9$**: `HIGH`
  * **$75.0 - 100.0$**: `CRITICAL`
* **Safety Override Floor:**
  * If an override rule triggers, score is automatically set to at least **90.0** and priority is stamped **`CRITICAL`**.

### How It Is Used:
1. Starts with the category base score (e.g. Potholes = 20).
2. Scans text for risk keywords (e.g. "hospital", "tire blowout", "deep crater").
3. Ignores any keyword if it is negated (e.g. *"no hazard"* adds 0 points).
4. Adds points from valid keywords up to the cap of each dimension:
   $$\text{Score} = \text{Base} + \text{Safety} + \text{Impact} + \text{Damage} + \text{Urgency}$$
5. Checks for critical emergency cues (active fire, live wire, structural collapse, trapped people). If found, score jumps to **90+ / CRITICAL**.
6. Maps the final score (0–100) into Low, Medium, High, or Critical.

