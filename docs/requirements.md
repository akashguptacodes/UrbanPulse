# UrbanPulse — Requirements Specification
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. Executive Summary and Mission

**UrbanPulse** is an AI-assisted civic issue reporting and complaint management platform designed to empower citizens and municipal authorities. 

Citizens often face opaque, slow, and fragmented channels when reporting neighborhood infrastructure and safety problems. Municipal authorities, conversely, struggle with high volumes of fragmented reports, duplicate complaints for identical incidents, and difficulty prioritizing urgent public hazards over routine maintenance.

UrbanPulse bridges this divide by providing:
1. A streamlined, transparent web interface for citizens to submit civic complaints with descriptions, geographic coordinates, and photo evidence.
2. An automated, explainable AI pipeline that flags probable duplicate complaints and calculates advisory priority scores.
3. A centralized administrative console for municipal staff to review AI recommendations, inspect duplicate candidates, transition complaint statuses, and monitor operational statistics.

---

## 2. User Personas and Stakeholders

### 2.1 Citizen (`CITIZEN` Role)
- **Profile:** A resident or commuter identifying a civic issue in their community.
- **Goals:**
  - Quickly report an issue on mobile or desktop web.
  - Pinpoint geographic location and upload photographic evidence.
  - Track complaint status transparently from submission to resolution.
  - View a personal history of submitted complaints.
- **Pain Points:** Lack of feedback after filing complaints; uncertainty if an issue has already been reported.

### 2.2 Municipal Administrator (`ADMIN` Role)
- **Profile:** City department staff, dispatcher, or public works manager.
- **Goals:**
  - Review incoming civic complaints across city jurisdictions.
  - Identify and link duplicate complaints to reduce redundant crew dispatches.
  - Triage urgent safety hazards immediately using AI priority assessments.
  - Update complaint statuses with transparent audit logging and resolution notes.
  - Monitor aggregate civic metrics (volume by category, resolution times, hotspot trends).
- **Pain Points:** Information overload, manual cross-referencing of complaints, accidental dispatch to duplicate locations, missed critical hazards.

---

## 3. Scope and Functional Boundaries

### 3.1 Fixed Functional Scope: Primary Categories
The platform supports **strictly four primary complaint categories**. No additional primary categories may be introduced in this phase:

| Category Key | Display Name | Scope Description | Example Issues |
| :--- | :--- | :--- | :--- |
| `POTHOLES` | Potholes & Road Surface | Road craters, asphalt erosion, dangerous street cracks, sinking road patches. | Deep pothole on Main St, damaged road surface near crosswalk. |
| `STREET_LIGHTS` | Street Lighting | Malfunctioning, flickering, non-operational, or damaged public street lamps. | Dark alley light pole, continuous daytime burning, broken fixture. |
| `GARBAGE` | Garbage & Sanitation | Overflowing public dumpsters, illegal trash dumping, uncollected municipal waste. | Piles of waste on curb, overflowing sidewalk bin, dumped debris. |
| `DISASTERS` | Civic Emergencies & Disasters | Severe, high-impact public safety events requiring urgent municipal attention. | Flooded underpass, structural collapse, active public fires. |

### 3.2 Extensible Disaster Sub-Types
For complaints categorized under `DISASTERS`, an optional secondary attribute `disaster_type` must be provided. The initial supported values are:
- `FIRE` (urban brush fire, electrical fire hazard, smoke condition)
- `FLOOD` (street flooding, sewer overflow, submerged roadway)
- `OTHER` (unspecified disaster or acute hazard)

*Taxonomy Rule:* The `disaster_type` field is designed as an extensible string/enum to accommodate future disaster classifications (e.g., `STORM_DAMAGE`, `LANDSLIDE`) without altering or breaking the core primary category taxonomy.

### 3.3 Explicit Exclusions (Out of Scope for Sprints 0–9)
To prevent scope creep and keep the codebase simple and maintainable, the following are strictly excluded:
- Native mobile applications (iOS/Android) — responsive web app will be used.
- Payment gateways, municipal fines, or billing.
- Real-time conversational AI chatbots or generative conversational agents.
- Social feeds, citizen upvoting, public commenting, or social sharing.
- Computer vision/deep-learning models (CNNs, image classifiers, image similarity). Images serve strictly as evidence attachments.
- Automated third-party notification services (SMS/Twilio, external email relays, push notifications) — in-app status updates will serve as the communication layer.

---

## 4. Functional Requirements

### 4.1 Citizen Authentication and Account Management
- **FR-AUTH-01:** Citizens and administrators must be able to register using full name, unique email address, and a secure password.
- **FR-AUTH-02:** Registered users must be able to authenticate securely and obtain an authenticated session.
- **FR-AUTH-03:** The system must enforce role-based access control with two roles: `CITIZEN` and `ADMIN`.
- **FR-AUTH-04:** Users must be able to view their profile and securely log out.

### 4.2 Complaint Submission (Citizen)
- **FR-SUB-01:** Authenticated citizens must be able to file complaints specifying:
  - Primary category (one of `POTHOLES`, `STREET_LIGHTS`, `GARBAGE`, `DISASTERS`).
  - Optional `disaster_type` (if primary category is `DISASTERS`).
  - Title and detailed narrative description.
  - Geographic coordinates (latitude and longitude).
  - Optional street address or landmark description.
  - Up to 3 photographic evidence attachments.
- **FR-SUB-02:** The system must validate coordinates against standard geographic limits (-90 to +90 latitude, -180 to +180 longitude).
- **FR-SUB-03:** Complaint submissions must be recorded with an initial status of `SUBMITTED`.

### 4.3 Complaint Tracking and History
- **FR-TRK-01:** Citizens must be able to view a paginated list of all complaints they have submitted.
- **FR-TRK-02:** Citizens must be able to view the full details of their own complaint, including current status, attached evidence, and status transition timeline.
- **FR-TRK-03:** Citizens must be prohibited from viewing complaints filed by other citizens.
- **FR-TRK-04:** Every status change must generate an immutable status history record noting the previous status, new status, timestamp, and optional administrative notes.

### 4.4 Administrative Review and Status Management
- **FR-ADM-01:** Administrators must be able to list all complaints across the platform with filtering (by category, status, disaster type, date range), sorting, and pagination.
- **FR-ADM-02:** Administrators must be able to inspect complaint details, evidence photos, AI duplicate recommendations, and AI priority assessments.
- **FR-ADM-03:** Administrators must be able to transition a complaint's status according to defined lifecycle rules:
  - `SUBMITTED` -> `UNDER_REVIEW` or `REJECTED`
  - `UNDER_REVIEW` -> `IN_PROGRESS` or `REJECTED`
  - `IN_PROGRESS` -> `RESOLVED` or `REJECTED`
- **FR-ADM-04:** All administrative status transitions, duplicate merges/dismissals, and priority overrides must be recorded in an immutable audit log.

### 4.5 AI Duplicate Complaint Detection
- **FR-AI-DUP-01:** When a new complaint is filed, the system must trigger duplicate detection against existing active complaints in the same category.
- **FR-AI-DUP-02:** Duplicate detection must evaluate three transparent signals:
  1. *Geographic proximity* (Haversine distance).
  2. *Lexical similarity* (TF-IDF cosine similarity).
  3. *Semantic similarity* (Sentence Transformers embedding cosine similarity).
- **FR-AI-DUP-03:** The AI service must return candidate complaint IDs, individual signal scores, a combined duplicate score, a confidence recommendation (`POSSIBLE_DUPLICATE` vs `UNLIKELY_DUPLICATE`), and a plain-text explanation.
- **FR-AI-DUP-04:** The system must **never** automatically merge or discard complaints. AI results are strictly advisory; administrative confirmation is mandatory.

### 4.6 AI Priority and Severity Assessment
- **FR-AI-PRIO-01:** When a complaint is filed, the system must evaluate its severity and urgency based on citizen description and category.
- **FR-AI-PRIO-02:** The priority engine must extract critical risk factors: safety hazards, imminent danger, infrastructure damage extent, public disruption, and time sensitivity.
- **FR-AI-PRIO-03:** The system must compute a normalized priority score (0–100) mapped to four priority bands: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **FR-AI-PRIO-04:** The system must support immediate deterministic safety overrides (e.g., active fires, live wires, severe flooding) forcing `CRITICAL` priority regardless of statistical scoring.
- **FR-AI-PRIO-05:** AI priority is advisory. Administrators can inspect contributing factors and override the priority band with an audit trail.

### 4.7 Administrative Dashboard and Reporting
- **FR-DASH-01:** Administrators must have access to high-level metric summaries:
  - Total complaint count and distribution by category.
  - Count by status (`SUBMITTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`).
  - Count by priority band (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Average resolution time for resolved complaints.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance and Scalability
- **NFR-PERF-01:** Main backend REST API endpoints must respond within 200ms (P95) under standard local load, excluding asynchronous AI processing.
- **NFR-PERF-02:** Asynchronous duplicate detection and priority evaluation must complete within 2.0 seconds per complaint on modern multi-core CPU hardware without GPU acceleration.
- **NFR-PERF-03:** Database queries for complaint filtering, pagination, and history must be indexed to ensure sub-50ms execution times.

### 5.2 Security and Access Control
- **NFR-SEC-01:** User passwords must be hashed using `bcrypt` (work factor 12) or `argon2id` prior to persistence. Plaintext passwords must never be logged or transmitted in responses.
- **NFR-SEC-02:** Authentication must rely on cryptographically signed tokens delivered via `HttpOnly`, `SameSite=Lax`, `Secure` cookies to protect against token theft via XSS.
- **NFR-SEC-03:** Client-supplied role headers or user identifiers must never be trusted; user identity and role must be derived strictly from server-validated session tokens.
- **NFR-SEC-04:** All incoming request payloads must be strictly validated against Zod schemas on the backend before processing.
- **NFR-SEC-05:** Uploaded files must be restricted to image MIME types (`image/jpeg`, `image/png`, `image/webp`), capped at 5 MB per file, stripped of EXIF data, and stored outside the web root with sanitized UUID filenames.

### 5.3 Reliability and Graceful Degradation
- **NFR-REL-01:** The failure, crash, or network timeout of an AI microservice must never block or abort a citizen's complaint submission.
- **NFR-REL-02:** In the event of AI service unavailability, the complaint must be persisted with status `SUBMITTED`, priority flagged as `PENDING_TRIAGE`, and duplicate status flagged as `UNPROCESSED`.
- **NFR-REL-03:** The system must provide `/health` check endpoints across all services for operational monitoring.

### 5.4 Explainability and Transparency
- **NFR-EXP-01:** AI recommendations must not operate as an unexplainable black box. Every duplicate candidate must show individual distance (meters), lexical score, semantic score, and composite score.
- **NFR-EXP-02:** Priority assessments must list the specific extracted keywords and risk factors that influenced the score.
- **NFR-EXP-03:** Citizen-supplied text must be visually and structurally distinguished from AI-inferred interpretations in administrative interfaces.

### 5.5 Usability and Accessibility
- **NFR-UI-01:** The web interface must be fully responsive across mobile (375px+), tablet, and desktop viewports.
- **NFR-UI-02:** All forms must provide clear inline validation messages, visual focus indicators, and accessible keyboard navigation (WCAG 2.1 AA guidelines).
- **NFR-UI-03:** When complaints are submitted under `DISASTERS`, the interface must display prominent emergency contact guidance (e.g., local 911/112 equivalents), explicitly clarifying that UrbanPulse is an administrative tracking tool, not an emergency dispatch center.

---

## 6. Constraints and Assumptions

1. **Local-First Development:** The entire system must be runnable locally using standard Docker Compose and npm/python commands without requiring commercial cloud services (AWS, GCP, Azure) or paid API subscriptions.
2. **Deterministic Architecture:** Architecture and data schemas must be straightforward and avoid unnecessary microservice fragmentation, service meshes, or enterprise message brokers. Simple direct HTTP communication between backend and AI services meets all operational requirements.
3. **No Image ML:** Computer vision models (CNNs/ViTs) are explicitly out of scope. Photographic attachments serve solely as human evidence.
