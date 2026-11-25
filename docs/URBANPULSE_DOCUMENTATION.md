# UrbanPulse — Complete Project Documentation

> AI-Assisted Civic Issue Reporting & Complaint Management Platform

---

## 1. What Is UrbanPulse?

UrbanPulse is a web platform where **citizens report civic problems** (potholes, broken streetlights, garbage, disasters) and **municipal administrators manage and resolve them**.

What makes it special:
- **AI Duplicate Detection** — Automatically finds if someone already reported the same problem nearby.
- **AI Priority Scoring** — Automatically calculates how dangerous/urgent each complaint is (0–100 score).
- **Safety Overrides** — Life-threatening emergencies (fire, electrocution, building collapse) are always forced to CRITICAL priority, regardless of what the AI model predicts.

---

## 2. Project Architecture (How Everything Connects)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CITIZEN / ADMIN                          │
│                     (Web Browser)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 FRONTEND (React + TypeScript)                    │
│                 Port: 5173 (dev) / Nginx (prod)                 │
│                 Vite + Tailwind CSS + React Router              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API calls
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + Express)                      │
│                 Port: 5000                                       │
│                 TypeScript + Prisma ORM + Zod Validation         │
│                                                                  │
│  Responsibilities:                                               │
│  • Authentication (JWT cookies, bcrypt passwords)                │
│  • Role-Based Access Control (CITIZEN / ADMIN)                   │
│  • Complaint CRUD, status lifecycle, audit logging               │
│  • Photo evidence upload & storage                               │
│  • Orchestrates calls to both AI services                        │
│  • Saves AI results into the database                            │
└────────┬─────────────────────────────┬──────────────────────────┘
         │                             │
         ▼                             ▼
┌─────────────────────┐  ┌──────────────────────────┐
│  DUPLICATE SERVICE  │  │   PRIORITY SERVICE       │
│  (Python + FastAPI) │  │   (Python + FastAPI)     │
│  Port: 8001         │  │   Port: 8002             │
│                     │  │                          │
│  • Haversine Geo    │  │  • XGBoost ML Model      │
│  • Jaccard Lexical  │  │  • Rule-Based Fallback   │
│  • SBERT Semantic   │  │  • Safety Overrides      │
│  • Weighted Scoring │  │  • NLP Keyword Extractor │
└─────────────────────┘  └──────────────────────────┘
         │                             │
         └──────────┬──────────────────┘
                    ▼
         ┌──────────────────┐
         │   PostgreSQL 16  │
         │   (via Prisma)   │
         │   Port: 5432     │
         └──────────────────┘
```

### Key Architecture Rules
1. **Backend is the single source of truth.** Only the backend talks to the database. AI services never touch the database directly.
2. **AI services are stateless.** They receive data via HTTP, compute results, and return them. No database credentials, no stored state.
3. **Fail-safe design.** If either AI service is down or slow, the backend still accepts the complaint and flags it for manual review. Citizen submissions are never blocked.

---

## 3. Folder Structure

```
UrbanPulse/
├── frontend/                    # React 18 web application
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, Modals, Cards)
│   │   ├── pages/               # Page components (ReportComplaint, ComplaintList, etc.)
│   │   ├── services/            # API client functions (complaintApi, authApi)
│   │   ├── types/               # TypeScript interfaces
│   │   └── App.tsx              # Route definitions & role guards
│   └── package.json
│
├── backend/                     # Node.js Express API server
│   ├── src/
│   │   ├── controllers/         # HTTP request handlers
│   │   ├── services/            # Business logic (complaintService, aiOrchestrator)
│   │   ├── routes/              # Express route definitions
│   │   ├── validators/          # Zod validation schemas
│   │   ├── middleware/          # Auth, RBAC, error handling
│   │   └── config/             # Environment config
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── package.json
│
├── ai-services/
│   ├── duplicate_service/       # Duplicate detection microservice
│   │   ├── app/
│   │   │   ├── main.py          # FastAPI app entry point
│   │   │   ├── detector.py      # Core detection algorithms
│   │   │   ├── schemas.py       # Request/response models
│   │   │   └── config.py        # Thresholds & weights
│   │   └── requirements.txt
│   │
│   └── priority_service/        # Priority scoring microservice
│       ├── app/
│       │   ├── main.py          # FastAPI app entry point
│       │   ├── scoring/
│       │   │   └── engine.py    # Hybrid scoring engine (XGBoost + rules)
│       │   ├── features/
│       │   │   └── extractor.py # 16-feature vector extractor for XGBoost
│       │   ├── models/
│       │   │   ├── xgboost_model.py     # Singleton model loader
│       │   │   └── artifacts/
│       │   │       ├── priority_xgb.json        # Trained XGBoost model file
│       │   │       └── feature_importance.json  # Feature ranking
│       │   ├── extraction/
│       │   │   ├── indicators.py   # Keyword pattern matcher (5 risk dimensions)
│       │   │   └── negation.py     # Negation-aware context filter
│       │   ├── safety_rules/
│       │   │   └── rules.py     # Deterministic safety overrides
│       │   ├── schemas/
│       │   │   └── priority.py  # Pydantic request/response models
│       │   └── core/
│       │       └── config.py    # All configurable thresholds
│       ├── training/
│       │   ├── train_xgboost.py         # Training pipeline script
│       │   └── generate_dataset_5000.py # Dataset generator
│       ├── data/
│       │   ├── priority_training_dataset_5000.csv  # 5,000 training records
│       │   └── priority_training_dataset_5000.json
│       └── requirements.txt
│
├── infra/                       # Docker Compose configs
└── docs/                        # This documentation
```

---

## 4. AI Service 1: Duplicate Detection (Port 8001)

### What It Does
When a citizen submits a complaint, the backend sends it to this service along with existing complaints in the same category from nearby locations. The service checks if the new complaint is a duplicate of an existing one.

### Algorithms Used (3 Signals Combined)

#### Signal A: Geographic Distance (Weight: 40%)
- **Algorithm:** Haversine Formula
- **What it does:** Calculates real-world distance in meters between two GPS coordinates on Earth's curved surface.
- **How scoring works:** Distance is converted to a similarity score (0.0 to 1.0). Same spot = 1.0. Beyond the search limit = 0.0.

#### Signal B: Text Similarity — Lexical (Weight: 20%)
- **Algorithm:** Jaccard Similarity + Levenshtein Ratio
- **What it does:** Compares the actual words used. If two complaints use many of the same words, the score is high.
- **Example:** "Deep pothole on main road" vs "Large pothole on main road" → High lexical match.

#### Signal C: Text Similarity — Semantic (Weight: 40%)
- **Algorithm:** Sentence-BERT (`all-MiniLM-L6-v2`)
- **What it does:** Understands the *meaning* of text, not just exact words. Converts each complaint into a 384-number vector, then measures how similar those vectors are.
- **Why it matters:** "Road crater causing accidents" and "Huge pothole making cars swerve" mean the same thing even though they share almost no words. This catches that.
- **Model:** `all-MiniLM-L6-v2` — 80 MB, runs on CPU, free, open-source (Apache 2.0).

#### Combined Score Formula

```
Final Score = (0.40 × Geo Score) + (0.20 × Lexical Score) + (0.40 × Semantic Score)
```

### Decision Thresholds

| Final Score | Verdict | What Happens |
|---|---|---|
| ≥ 0.75 | `LIKELY_DUPLICATE` | Strong match — shown to citizen and admin for confirmation |
| 0.50 – 0.74 | `POSSIBLE_DUPLICATE` | Moderate match — flagged for review |
| < 0.50 | `UNLIKELY_DUPLICATE` | Different issue — no duplicate flag |

### Category Distance Limits
Each category has a maximum search radius:

| Category | Max Distance |
|---|---|
| Potholes | 100 meters |
| Street Lights | 100 meters |
| Garbage | 150 meters |
| Disasters | 500 meters |

### Hyper-Local Rule
If two complaints are within **15 meters** of each other and in the same category, the score is automatically boosted to at least **0.50** (POSSIBLE_DUPLICATE), even if the text is completely different.

### Citizen-in-the-Loop Flow
Before a complaint is saved, the frontend calls a **pre-check endpoint**. If potential duplicates are found:
1. A modal pops up showing existing similar reports (with distance, match %, status).
2. The citizen can choose:
   - **"Yes, Discard Mine"** — Their draft is discarded, they're thanked for checking.
   - **"No, Mine is Different"** — Complaint is submitted with `override_duplicate: true`.

---

## 5. AI Service 2: Priority Scoring (Port 8002)

### What It Does
Calculates a severity score (0 to 100) for each complaint and assigns a priority level (LOW, MEDIUM, HIGH, CRITICAL). This helps administrators know which issues to fix first.

### How It Works (Hybrid Architecture)

The priority service uses a **two-layer hybrid approach**:

```
Layer 1: XGBoost ML Model (primary scorer)
         ↓
Layer 2: Deterministic Safety Overrides (always enforced on top)
```

If the XGBoost model is unavailable (file missing, library not installed), it **automatically falls back** to a rule-based scoring system. The service never crashes.

---

### Layer 1: XGBoost Machine Learning Model

#### What is XGBoost?
XGBoost (Extreme Gradient Boosting) is a machine learning algorithm that builds many small decision trees, where each tree learns from the mistakes of the previous one. It's widely used for tabular/structured data because it's fast, accurate, and interpretable.

#### Training Data
- **Dataset:** 5,000 realistic civic complaint records
- **Location:** `ai-services/priority_service/data/priority_training_dataset_5000.csv`
- **Split:** 80% training (4,000 samples) / 20% test (1,000 samples)

#### 16 Input Features (What the model sees)

The model doesn't see raw text. The `FeatureExtractor` converts each complaint into a fixed-size vector of 16 numbers:

| # | Feature Name | Type | Description |
|---|---|---|---|
| 1 | `cat_potholes` | One-hot | Is category POTHOLES? (1.0 or 0.0) |
| 2 | `cat_street_lights` | One-hot | Is category STREET_LIGHTS? |
| 3 | `cat_garbage` | One-hot | Is category GARBAGE? |
| 4 | `cat_disasters` | One-hot | Is category DISASTERS? |
| 5 | `dis_fire` | One-hot | Is disaster type FIRE? |
| 6 | `dis_flood` | One-hot | Is disaster type FLOOD? |
| 7 | `dis_other` | One-hot | Is disaster type OTHER? |
| 8 | `char_length` | Numeric | Total character count of title + description |
| 9 | `word_count` | Numeric | Total word count |
| 10 | `exclamation_count` | Numeric | Number of `!` marks (urgency signal) |
| 11 | `has_digits` | Binary | Does text contain numbers? (e.g., "2 feet deep") |
| 12 | `upper_ratio` | Numeric | Ratio of uppercase letters (shouting = urgency) |
| 13 | `safety_cue_count` | Count | Matches for: danger, hazard, spark, wire, shock, fire, flame, collapse, trapped, blood, toxic, leak |
| 14 | `impact_cue_count` | Count | Matches for: hospital, school, traffic, choked, blocked, bus stop, market, intersection, ambulance |
| 15 | `damage_cue_count` | Count | Matches for: blowout, burst, broken, ruptured, chasm, crater, sinkhole, submerged |
| 16 | `urgency_cue_count` | Count | Matches for: urgent, immediately, emergency, hours, days, serious |

#### Training Configuration

| Parameter | Value | What It Means |
|---|---|---|
| `objective` | `reg:squarederror` | Regression task (predict continuous score 0–100) |
| `max_depth` | 5 | Each decision tree can be at most 5 levels deep |
| `eta` (learning rate) | 0.07 | How much each new tree corrects the previous ones |
| `subsample` | 0.85 | Each tree uses 85% of training data (prevents overfitting) |
| `colsample_bytree` | 0.85 | Each tree uses 85% of features |
| `num_boost_round` | 150 | Total number of trees built |
| `seed` | 42 | Reproducible randomness |

#### Model Accuracy

| Metric | Value | Meaning |
|---|---|---|
| **MAE** | 9.66 points | On average, the prediction is off by ~10 points on a 0–100 scale |
| **RMSE** | 12.93 points | Root mean square error (penalizes big mistakes more) |
| **R² Score** | 71.8% | The model explains ~72% of the variance in severity |
| **Priority Bucket Accuracy** | 70.8% | Puts complaints in the correct LOW/MEDIUM/HIGH/CRITICAL bucket ~71% of the time |

#### Top Predictive Features (What matters most)
1. `exclamation_count` — Urgent complaints have more `!` marks
2. `damage_cue_count` — Words like crater, sinkhole, burst, submerged
3. `safety_cue_count` — Words like danger, fire, trapped, toxic
4. `char_length` — Citizens write longer descriptions for serious issues
5. `cat_disasters` — Disaster category inherently scores higher

#### Model File
- **Path:** `ai-services/priority_service/app/models/artifacts/priority_xgb.json`
- **Format:** Native XGBoost JSON (portable, no pickle)
- **Loaded at startup** as a global singleton. If the file is missing, the service silently falls back to rule-based scoring.

#### How to Retrain
```powershell
cd d:\UrbanPulse\ai-services\priority_service
python training\train_xgboost.py
```
This takes ~5 seconds and overwrites `priority_xgb.json`.

---

### Rule-Based Fallback (Used when XGBoost is unavailable)

If XGBoost model file or library is not available, the service uses this additive scoring formula:

```
Score = Base Score + Safety Points + Impact Points + Damage Points + Urgency Points
```

#### Category Base Scores

| Category | Base Score |
|---|---|
| Disasters | 50 points |
| Potholes | 20 points |
| Street Lights | 15 points |
| Garbage | 15 points |

#### Risk Factor Caps

| Dimension | Max Contribution | Example Keywords |
|---|---|---|
| Safety Hazard | +35 points | spark, fire, collapse, trapped, toxic |
| Public Impact | +20 points | hospital, school, intersection, ambulance |
| Damage Extent | +15 points | crater, sinkhole, submerged, ruptured |
| Urgency | +10 points | emergency, immediately, spreading |

#### Negation Awareness
The system checks 4 words before each keyword for negation terms (`not`, `no`, `never`, `resolved`, `fixed`). If a keyword is negated (e.g., *"no fire detected"*), it contributes **0 points**.

---

### Layer 2: Deterministic Safety Overrides (Always Active)

These rules **always run on top** of whatever score the XGBoost or rule-based system produces. They can only push the score **up**, never down. This ensures life-threatening emergencies are never underestimated.

#### Override Rules

| Trigger | Condition | Action |
|---|---|---|
| Active Fire | Category is DISASTERS + type is FIRE, or text contains "active fire" / "flames spreading" | Score forced to ≥ 90, Priority = CRITICAL |
| Electrical Hazard | Text contains "live wire", "sparking transformer", "arcing cable", "electrocution risk" | Score forced to ≥ 90, Priority = CRITICAL |
| Structural Collapse | Text contains "structural collapse" or "building collapse" | Score forced to ≥ 90, Priority = CRITICAL |
| Trapped Persons | Text contains "trapped person", "people trapped", "hazard to life" | Score forced to ≥ 90, Priority = CRITICAL |
| Severe Flooding | Category is DISASTERS + FLOOD, text contains "water rising rapidly", "submerged road", "waist high water" | Score forced to ≥ 90, Priority = CRITICAL |

**Important:** Override keywords are also checked against negation. *"No fire detected"* will NOT trigger the fire override.

### Priority Level Bands

| Score Range | Priority Level |
|---|---|
| 0 – 24.9 | LOW |
| 25 – 49.9 | MEDIUM |
| 50 – 74.9 | HIGH |
| 75 – 100 | CRITICAL |

---

## 6. Complete Flow: What Happens When a Citizen Submits a Complaint

Here is the step-by-step flow from the moment a citizen clicks "Submit" to the complaint appearing on the admin dashboard:

```
CITIZEN fills out form (category, title, description, location, optional photo)
        │
        ▼
FRONTEND calls POST /api/complaints/check-duplicate (pre-check)
        │
        ├── If duplicates found → Show modal with similar reports
        │   ├── Citizen clicks "Discard" → Draft deleted, thanked
        │   └── Citizen clicks "Keep & Submit" → Proceeds with override_duplicate: true
        │
        └── If no duplicates → Proceeds directly
        │
        ▼
FRONTEND calls POST /api/complaints (create complaint)
        │
        ▼
BACKEND receives request
        │
        ├── 1. Verify JWT cookie → Confirm citizen is logged in
        ├── 2. Validate all fields with Zod schemas
        ├── 3. Save photo to disk (if uploaded)
        ├── 4. INSERT complaint into PostgreSQL (status: SUBMITTED)
        │
        ├── 5. Call Duplicate Service (Port 8001)
        │      → Send new complaint + nearby candidates
        │      ← Receive similarity scores & duplicate verdict
        │
        ├── 6. Call Priority Service (Port 8002)
        │      → Send category, disaster_type, title, description
        │      ← Receive severity score (0–100), priority level, safety overrides
        │
        ├── 7. Save AI results into database (ai_assessment JSON field)
        │
        └── 8. Return 201 Created to frontend
        │
        ▼
ADMIN opens dashboard
        │
        ├── Sees complaints sorted by priority (CRITICAL first)
        ├── Reviews AI duplicate suggestions
        ├── Transitions status: SUBMITTED → UNDER_REVIEW → IN_PROGRESS → RESOLVED
        └── All transitions logged in audit trail
```

---

## 7. Database Overview

**Engine:** PostgreSQL 16, managed via Prisma ORM.

### Core Tables

| Table | Purpose |
|---|---|
| `User` | Citizen and admin accounts (email, bcrypt password hash, role) |
| `Complaint` | The central civic issue record (category, title, description, coordinates, status) |
| `ComplaintEvidence` | Photo attachment metadata (file path, MIME type, size) |
| `ComplaintStatusHistory` | Immutable audit trail of every status change |
| `AuditLog` | Administrative action log (who did what, when) |

### Complaint Status Lifecycle

```
SUBMITTED → UNDER_REVIEW → IN_PROGRESS → RESOLVED
     │            │              │
     └── REJECTED ┘── REJECTED ──┘── REJECTED
```

- Only ADMINs can change status.
- Citizens cannot modify status.
- Rejection always requires a written reason.
- RESOLVED and REJECTED are terminal states (no going back).

---

## 8. Authentication & Security

| Feature | Implementation |
|---|---|
| Password Storage | bcrypt hash (work factor 12) |
| Session Token | JWT stored in HttpOnly, Secure, SameSite cookie |
| Role Control | CITIZEN (submit & view own) / ADMIN (manage all) |
| Input Validation | Zod schemas on every endpoint |
| Photo Validation | MIME type check (JPEG/PNG/WEBP only), max 5 MB per file |
| AI Service Isolation | AI services run on internal network, no database credentials, no public access |

---

## 9. How to Run the Full Platform

### Prerequisites
- Node.js ≥ 20, npm ≥ 10
- Python ≥ 3.11, pip
- PostgreSQL 16 running (or via Docker)

### Start All Services (4 Terminal Tabs)

**Tab 1 — Priority Service:**
```powershell
cd d:\UrbanPulse\ai-services\priority_service
python -m uvicorn app.main:app --port 8002 --reload
```

**Tab 2 — Duplicate Service:**
```powershell
cd d:\UrbanPulse\ai-services\duplicate_service
python -m uvicorn app.main:app --port 8001 --reload
```

**Tab 3 — Backend:**
```powershell
cd d:\UrbanPulse\backend
npm run dev
```

**Tab 4 — Frontend:**
```powershell
cd d:\UrbanPulse\frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 10. Configurable Thresholds (All in One Place)

### Duplicate Service (`ai-services/duplicate_service/app/config.py`)

| Setting | Value | What It Controls |
|---|---|---|
| `GEO_WEIGHT` | 0.40 | Weight of geographic distance in combined score |
| `LEXICAL_WEIGHT` | 0.20 | Weight of word overlap in combined score |
| `SEMANTIC_WEIGHT` | 0.40 | Weight of meaning similarity in combined score |
| `LIKELY_THRESHOLD` | 0.75 | Score above this = LIKELY_DUPLICATE |
| `POSSIBLE_THRESHOLD` | 0.50 | Score above this = POSSIBLE_DUPLICATE |
| `HYPERLOCAL_DISTANCE` | 15 meters | Within this distance, score is boosted to ≥ 0.50 |

### Priority Service (`ai-services/priority_service/app/core/config.py`)

| Setting | Default | What It Controls |
|---|---|---|
| `BASE_SCORE_DISASTERS` | 50.0 | Starting score for disaster complaints |
| `BASE_SCORE_POTHOLES` | 20.0 | Starting score for pothole complaints |
| `BASE_SCORE_STREET_LIGHTS` | 15.0 | Starting score for streetlight complaints |
| `BASE_SCORE_GARBAGE` | 15.0 | Starting score for garbage complaints |
| `MAX_FACTOR_SAFETY` | 35.0 | Max points from safety keywords |
| `MAX_FACTOR_IMPACT` | 20.0 | Max points from public impact keywords |
| `MAX_FACTOR_DAMAGE` | 15.0 | Max points from damage keywords |
| `MAX_FACTOR_URGENCY` | 10.0 | Max points from urgency keywords |
| `THRESHOLD_MEDIUM` | 25.0 | Score ≥ this = MEDIUM priority |
| `THRESHOLD_HIGH` | 50.0 | Score ≥ this = HIGH priority |
| `THRESHOLD_CRITICAL` | 75.0 | Score ≥ this = CRITICAL priority |
| `SAFETY_OVERRIDE_MIN_SCORE` | 90.0 | Minimum score when safety override triggers |

### Backend (`backend/.env`)

| Setting | Default | What It Controls |
|---|---|---|
| `DUPLICATE_SERVICE_URL` | `http://localhost:8001` | Where to find the duplicate service |
| `PRIORITY_SERVICE_URL` | `http://localhost:8002` | Where to find the priority service |
| `AI_REQUEST_TIMEOUT_MS` | 2000 | Max time (ms) to wait for AI service response |

---

## 11. Tech Stack Summary

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons |
| **Backend** | Node.js 20, Express.js, TypeScript, Prisma ORM, Zod, bcrypt, JWT |
| **Database** | PostgreSQL 16 |
| **Duplicate AI** | Python 3.11, FastAPI, Sentence-Transformers (`all-MiniLM-L6-v2`), scikit-learn |
| **Priority AI** | Python 3.11, FastAPI, XGBoost, Pydantic |
| **Infrastructure** | Docker Compose (optional for PostgreSQL) |

