# UrbanPulse — Testing & AI Evaluation Strategy
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. Testing Philosophy & Quality Pyramid

UrbanPulse employs a structured, multi-tiered testing strategy designed to verify both **software functional correctness** (deterministic code, access control, transactional persistence) and **AI model quality** (statistical precision, recall, emergency safety override consistency).

```
                 / \
                /   \
               / E2E \       Playwright End-to-End User Journeys
              /-------\
             /  Integ  \     Supertest API & DB Integration Tests
            /-----------\
           /  AI Eval    \   Precision/Recall Benchmarks & Safety Triggers
          /---------------\
         /    Unit Tests   \ Vitest (Frontend/Backend) & Pytest (AI)
        /-------------------\
```

### Critical Separation: Software Correctness vs. AI Evaluation
- **Software Correctness Tests (Deterministic):** Validate that inputs are properly sanitized, database transactions commit or roll back atomically, authentication cookies are cryptographically verified, and state machine transitions reject illegal operations. These tests have binary pass/fail outcomes.
- **AI Evaluation (Probabilistic & Heuristic):** Evaluates the statistical performance of duplicate detection and priority scoring algorithms against curated test scenarios and benchmark datasets. Assesses precision, recall, F1-score, false-positive rates, and 100% adherence to emergency safety overrides.

---

## 2. Testing Layers & Tooling

| Testing Layer | Target Scope | Primary Tooling | Execution Frequency |
| :--- | :--- | :--- | :--- |
| **Frontend Unit / Component** | UI components, form validation rules, custom hooks, state handlers | Vitest, React Testing Library, jsdom | Every commit / PR |
| **Backend Unit** | Business logic, validators, scoring utilities, storage helpers | Vitest / Jest, TypeScript | Every commit / PR |
| **Backend Integration** | REST endpoints, Prisma queries, auth middleware, file upload checks | Supertest, Test PostgreSQL container | Every PR / CI build |
| **AI Microservices Unit** | Haversine calculations, TF-IDF vectorization, FastAPI routes | Pytest, HTTPX, Pydantic | Every commit / PR |
| **AI Model Evaluation** | Multi-signal duplicate accuracy, priority factor weighting, safety rules | Pytest benchmark scripts, curated JSON test sets | Sprint 5, 6, 8, & Releases |
| **End-to-End (E2E)** | Full citizen complaint submission to administrative resolution | Playwright | Pre-merge & Release builds |
| **Security & Pentest** | Injection, CORS bypass, rate limiting, file upload exploit defense | Custom test harnesses, OWASP ZAP automated scans | Sprint 8 & 9 |

---

## 3. Detailed Test Suites

### 3.1 Authentication & Authorization Test Suite
- **Registration & Login:**
  - Verify duplicate email registration returns `409 Conflict`.
  - Verify password complexity requirements (reject $<8$ chars or missing specials).
  - Verify correct credentials set `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
  - Verify invalid credentials return generic `401 Unauthorized` without leaking user existence.
- **Role-Based Access Control (RBAC):**
  - Verify unauthenticated requests to `/api/v1/complaints` return `401`.
  - Verify `CITIZEN` user querying `/api/v1/complaints` receives **only** their own complaints.
  - Verify `CITIZEN` user attempting to access `/api/v1/complaints/:id/status` returns `403 Forbidden`.
  - Verify `ADMIN` user can access all complaints, update status, and review AI candidates.

### 3.2 Complaint Management & Storage Test Suite
- **Input Validation:**
  - Verify submitting a complaint with an unknown category (e.g. `TRAFFIC`) returns `422 Unprocessable Entity`.
  - Verify coordinates outside range (e.g., latitude $95.0$) return `422`.
  - Verify description length constraints (minimum 10 characters, maximum 2000).
- **Evidence Upload Security:**
  - Verify file upload of executable `.exe` or `.sh` masked as `.jpg` is detected via magic bytes and rejected (`400 Bad Request`).
  - Verify file uploads exceeding 5 MB return `400 Bad Request`.
  - Verify uploaded images have EXIF metadata stripped and are written with UUID filenames.
- **Status State Machine & Audit History:**
  - Verify transition from `SUBMITTED` -> `UNDER_REVIEW` succeeds and appends a `ComplaintStatusHistory` record.
  - Verify illegal transition from `SUBMITTED` directly to `RESOLVED` fails with `400 Bad Request`.
  - Verify transition to `REJECTED` without a reason note fails with `400 Bad Request`.

### 3.3 AI Microservice Correctness Tests
- **Duplicate Service (`ai-services/duplicate_service`):**
  - Verify Haversine distance matches analytical calculations within 0.1% tolerance.
  - Verify empty candidate pool returns `200 OK` with zero matches.
  - Verify identical text and coordinates produce combined score $\approx 1.000$.
  - Verify distant complaints ($>150\text{m}$) yield $S_{\text{geo}} = 0.0$.
- **Priority Service (`ai-services/priority_service`):**
  - Verify output priority score is strictly bounded between $0.0$ and $100.0$.
  - Verify `all-MiniLM-L6-v2` embedding generation executes locally without network access.

---

## 4. AI Evaluation Framework & Performance Metrics

### 4.1 Duplicate Complaint Detection Evaluation

The duplicate detection engine will be evaluated using a curated benchmark dataset of 200 civic issue scenarios (synthetic and public municipal pairs) representing:
- Exact duplicate reports (same issue, slightly varied wording, $\le 20\text{m}$ apart).
- Colocated but distinct issues (e.g., a pothole and a broken streetlight at the same intersection).
- Semantically similar issues at different locations ($> 500\text{m}$ apart).
- Paraphrased descriptions using slang or typos.

#### Evaluation Metrics
$$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F_1 = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

#### Target Benchmark Criteria (Sprint 8 Evaluation)
- **High-Confidence Precision:** $\ge 85\%$ for candidate pairs where $S_{\text{combined}} \ge 0.75$.
- **Recall at Top-3 Candidates:** $\ge 90\%$ (the true duplicate appears within the top 3 suggested candidates).
- **False-Positive Auto-Link Rate:** **0%** (guaranteed by design, as the system mandates human administrator approval).
- **Inference Latency:** $\le 1.5$ seconds for candidate pools of up to 25 items on 4 CPU cores.

---

### 4.2 Priority & Severity Assessment Evaluation

#### 1. Emergency Safety Override Guarantee
- **Target:** **100% Recall on Immediate Danger Triggers.**
- **Test Suite:** 50 critical emergency test scenarios (active fire, sparking cables, gas leaks, road collapse, severe flooding).
- **Criterion:** Every test case must trigger `safety_override = true` and `priority_band = CRITICAL`. Zero false negatives are permitted on the emergency safety test suite.

#### 2. Priority Band Concordance
- A curated evaluation set of 150 non-emergency complaints categorized into `LOW`, `MEDIUM`, and `HIGH` by municipal triage experts.
- **Target Metric:** $\ge 80\%$ agreement with human triage baseline.
- **Misclassification Tolerance:** A low-severity issue misclassified as high is acceptable; a high-severity issue misclassified as low must not exceed 5% on the benchmark set.

---

## 5. End-to-End (E2E) Test Scenarios

The Playwright test suite will automate three critical user journeys:

### Journey 1: Citizen Complaint Submission Flow
1. Citizen navigates to registration page, registers account, and is redirected to dashboard.
2. Citizen clicks "Report an Issue", selects `POTHOLES`, enters title, description, and drops location pin.
3. Citizen attaches photo evidence (`sample_pothole.jpg`) and submits.
4. Verify success screen with generated Complaint ID.
5. Citizen opens "My Complaints" and verifies complaint is listed with status `SUBMITTED`.

### Journey 2: Administrative Triage & Duplicate Linking
1. Municipal admin logs in and views Admin Dashboard.
2. Admin locates new complaint in queue and opens details view.
3. System displays side-by-side duplicate candidate flagged with high similarity score ($>0.75$).
4. Admin inspects candidate details and clicks "Confirm Duplicate".
5. Verify duplicate link is recorded and audit log entry is generated.

### Journey 3: Emergency Disaster Submission with Safety Override
1. Citizen submits complaint under `DISASTERS` with `disaster_type = 'FIRE'`.
2. Verify emergency guidance banner is displayed to the citizen immediately.
3. Submission completes.
4. Admin views complaint: Priority band displays as **`CRITICAL`** with prominent **EMERGENCY SAFETY OVERRIDE** badge.
5. Admin updates status to `IN_PROGRESS` with work order dispatch note.
6. Verify status history preserves the transition and timestamp.

---

## 6. Release & Quality Gate Criteria

Before code from any sprint is merged to the main branch or tagged for release, it must satisfy these strict quality gates:

1. **Linting & Formatting:** ESLint, Prettier, and Flake8/Black pass with zero warnings or errors.
2. **Type Safety:** TypeScript compilation (`tsc --noEmit`) passes with zero type errors.
3. **Automated Test Coverage:**
   - Backend business logic: $\ge 80\%$ line coverage.
   - Core API endpoints: 100% route coverage.
   - AI safety overrides: 100% pass rate on emergency scenarios.
4. **Security Vulnerability Scan:** `npm audit` and Python safety checks report zero high or critical CVEs.
5. **No Visual/CNN Regressions:** Continuous verification that no computer vision or unapproved external dependencies were added to the codebase.
