# UrbanPulse — Architectural Decisions & Assumptions Log
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. Architecture Decision Records (ADRs)

### ADR-001: Monorepo Structure with Simple Folder Layout
- **Status:** Accepted.
- **Context:** UrbanPulse comprises a web frontend, an Express API backend, two lightweight Python AI services, and Docker infrastructure. We must decide between multiple separate repositories vs. a single unified monorepo.
- **Decision:** Use a single monorepo with clear, top-level service directories (`frontend`, `backend`, `ai-services/duplicate_service`, `ai-services/priority_service`, `infra`, `docs`).
- **Rationale:** Keeps developer onboarding seamless, allows synchronized atomic changes across API contracts and clients, simplifies Docker Compose development, and eliminates repository sprawl.
- **Alternatives Considered:**
  - *Multi-repo:* Creates overhead in managing 4+ repositories, synchronizing version tags, and coordinating local development environments.
  - *Complex monorepo tooling (Turborepo/Nx):* Rejected to avoid unnecessary tooling layers; simple npm and python project scripts within each directory are sufficient and lightweight.

---

### ADR-002: Authentication via HttpOnly Cookies vs. LocalStorage JWT
- **Status:** Accepted.
- **Context:** Single Page Applications (SPAs) communicating with REST APIs can store authentication tokens in browser `localStorage` or `HttpOnly` cookies.
- **Decision:** Deliver JWT session tokens exclusively via `Set-Cookie` with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes.
- **Rationale:** Storing tokens in `localStorage` leaves them permanently vulnerable to exfiltration by any Cross-Site Scripting (XSS) vulnerability in third-party npm dependencies. `HttpOnly` cookies cannot be accessed via client JavaScript, providing robust protection. `SameSite=Lax` provides strong protection against CSRF for standard REST API interactions.
- **Alternatives Considered:**
  - *LocalStorage with Authorization header:* Highly susceptible to XSS token theft; rejected.
  - *OAuth2/OIDC third-party providers (Auth0/Firebase):* Adds external dependency, cost, and complexity violating the local-first, zero-paid-API mandate.

---

### ADR-003: Fixed Taxonomy of 4 Primary Categories with Extensible Disaster Sub-types
- **Status:** Accepted.
- **Context:** Civic issue platforms can easily suffer from category bloat (hundreds of overlapping civic tags), confusing citizens and making automated duplicate detection unreliable.
- **Decision:** Mandate strictly four primary categories: `POTHOLES`, `STREET_LIGHTS`, `GARBAGE`, and `DISASTERS`. For `DISASTERS`, provide an extensible `disaster_type` attribute with initial values `FIRE`, `FLOOD`, and `OTHER`.
- **Rationale:**
  - Prevents categorization ambiguity for citizens filing reports.
  - Keeps duplicate candidate retrieval fast and focused by allowing exact-category partitioning.
  - Accommodates emergent civic hazards under `DISASTERS` without altering the primary category taxonomy.
- **Alternatives Considered:**
  - *Dynamic category tables created by admins:* Increases schema complexity and invalidates pre-trained NLP keyword models.
  - *Hierarchical multi-level categories for all issues:* Creates unnecessary form friction for citizens reporting routine issues.

---

### ADR-004: Sentence-Transformers Model Selection (`all-MiniLM-L6-v2`)
- **Status:** Accepted.
- **Context:** Semantic text comparison requires generating dense vector embeddings from complaint descriptions. The model must run locally without external API costs or dedicated GPU hardware.
- **Decision:** Standardize on `sentence-transformers/all-MiniLM-L6-v2`.
- **Rationale:**
  - Weighs only ~80 MB and requires less than 250 MB RAM at runtime.
  - Performs CPU inference in 15–25ms per text string.
  - Produces high-quality 384-dimensional embeddings optimized for sentence-level semantic similarity.
  - Free, open-source (Apache 2.0), and readily packaged in Python without proprietary drivers.
- **Alternatives Considered:**
  - *OpenAI text-embedding-3-small:* Violates the local-first, zero-cost mandate and introduces third-party latency and privacy exposure.
  - *RoBERTa-large:* Embedding quality improvement is negligible for short civic complaints, but file size (>1.3GB) and inference latency (>250ms on CPU) are unacceptable for local development.

---

### ADR-005: Explainable Rule-Based Priority Engine over Black-Box ML
- **Status:** Accepted.
- **Context:** Municipal work order prioritization requires high trust and legal transparency. Emergency hazards must never be missed due to statistical model hallucination or distribution shift.
- **Decision:** Implement the initial priority assessment service as an explainable, deterministic rule engine with explicit safety overrides, reserving supervised ML (Random Forest/XGBoost) for future iterations.
- **Rationale:**
  - Zero initial labeled data exists for this greenfield deployment. Training a statistical ML model on synthetic data risks dangerous false negatives on critical safety hazards.
  - Rule-based keyword and factor scoring provides 100% deterministic safety overrides for live wires, fires, and floods.
  - Every score can be explained to city officials with an exact breakdown of contributing factors.
- **Alternatives Considered:**
  - *Supervised Classifier (Random Forest / XGBoost) in Sprint 0:* Rejected due to lack of ground-truth municipal training datasets and risk of uncalibrated probabilities.

---

### ADR-006: Photo Evidence Storage Abstraction (Volume/Disk vs. Database BYTEA)
- **Status:** Accepted.
- **Context:** Complaint submissions allow up to 3 photographic evidence attachments.
- **Decision:** Store binary image data in an abstracted file storage layer (local filesystem volume mounted at `/uploads` for development/Sprint 0–9; cloud object storage ready) and persist only metadata (storage key, MIME type, size) in PostgreSQL.
- **Rationale:** Storing binary image blobs directly in PostgreSQL tables degrades database performance, bloats backups, consumes connection memory, and prevents direct CDN caching.
- **Alternatives Considered:**
  - *PostgreSQL `BYTEA` columns:* Rejected due to severe database bloat and performance degradation.
  - *Immediate mandatory AWS S3 integration:* Rejected to preserve local-first development without cloud dependencies.

---

### ADR-007: Stateless AI Microservices Orchestrated by Main Backend
- **Status:** Accepted.
- **Context:** We must establish communication and database access rules for the AI microservices.
- **Decision:** The AI microservices (`duplicate_service` and `priority_service`) are completely stateless and possess no database credentials or write access. The Express backend queries required candidate data, issues HTTP requests to the AI services with strict timeouts, and persists results.
- **Rationale:**
  - Enforces a single source of truth for authorization, transactions, and persistence in the backend.
  - Prevents race conditions and schema synchronization issues across multiple languages (Node.js Prisma vs. Python SQLAlchemy).
  - Keeps Python microservices lightweight and easy to test with simple HTTP mocks.
- **Alternatives Considered:**
  - *Direct database access from Python services:* Creates dual-ORM synchronization problems and breaches database trust boundaries.

---

### ADR-008: Exclusion of Computer Vision & Image Similarity Pipelines
- **Status:** Accepted.
- **Context:** Civic issue platforms frequently receive photographic evidence. We must decide whether to deploy Convolutional Neural Networks (CNNs) or Vision Transformers (ViTs) to classify images or compare visual similarity.
- **Decision:** Image classification, CNNs, image embeddings, and visual duplicate detection are **strictly excluded**. Photos serve purely as human evidence attachments for administrative inspection.
- **Rationale:**
  - Civic issue photographs exhibit extreme variability (angles, lighting, framing, obstructions, weather) resulting in high false-positive rates for automated visual duplicate detection without expensive deep learning infrastructure.
  - Geographic coordinates + NLP text embeddings provide vastly superior, explainable duplicate detection with a fraction of the compute overhead.
  - Running computer vision models locally severely strains developer machines without dedicated GPUs.
- **Alternatives Considered:**
  - *ResNet / CLIP image embeddings for duplicate verification:* High compute cost, poor reliability on varying civic angles, violates simplicity constraint.

---

### ADR-009: Direct HTTP Communication vs. Message Brokers (Kafka / RabbitMQ)
- **Status:** Accepted.
- **Context:** Communication between the main backend and AI microservices can use synchronous/asynchronous HTTP REST or an asynchronous message broker like RabbitMQ or Apache Kafka.
- **Decision:** Use direct HTTP REST with strict timeouts (1.5s–2.0s) and asynchronous fallback handling in the backend.
- **Rationale:**
  - Adheres strictly to the user constraint: *"Dont overengineer the project, just keep the code and folder structure simple, not so high engineer level."*
  - Avoids introducing heavy Java/Erlang message broker infrastructure to local development setups.
  - Standard HTTP with timeouts and error fallback provides robust, predictable behavior for expected civic complaint volumes.
- **Alternatives Considered:**
  - *Kafka / RabbitMQ:* Excessive operational complexity for the project's scale.

### ADR-010: Prisma Version Pinning (v5.22.0) and Cloud Database Connection Resilience
- **Status:** Accepted (Sprint 2).
- **Context:** Prisma 7 introduced breaking changes that deprecated datasource `url` declarations in schema files and required separate adapter configurations. We needed a stable, battle-tested version supporting both local PostgreSQL and serverless Cloud PostgreSQL (Neon) with standard migrations.
- **Decision:** Pin Prisma and `@prisma/client` to major version 5 (specifically `v5.22.0 LTS`), maintaining datasource `url = env("DATABASE_URL")` with standard migration folders and connection pooling.
- **Rationale:**
  - Guarantees 100% compatibility with standard PostgreSQL and Neon connection strings (`sslmode=require`).
  - Standardizes migration generation via `prisma migrate dev` and `prisma migrate deploy` without driver adapter boilerplate.
  - Sanitizes connection strings at startup to prevent leaking credentials in application logs.
- **Alternatives Considered:**
  - *Prisma 7 with experimental config drivers:* Rejected due to unstable migration conventions and added complexity.

---

## 2. Assumptions Log

| # | Assumption Description | Impact if Invalid | Validation / Resolution Path |
| :--- | :--- | :--- | :--- |
| **A-01** | Primary complaint language is English. | Semantic similarity and keyword extraction accuracy degrade for non-English descriptions. | If multilingual support is mandated in future, swap `all-MiniLM-L6-v2` with `paraphrase-multilingual-MiniLM-L12-v2`. |
| **A-02** | Municipal administrators access the application via modern desktop browsers (Chrome, Firefox, Safari, Edge). | Legacy browser compatibility issues. | Standard Vite target (`es2020`) supports modern browsers. |
| **A-03** | Local development machines have at least 4 GB free RAM and 4 CPU cores to run Docker Compose, Node, and Python services. | Slower container boot times or Sentence-Transformer load delays. | Benchmark in Sprint 1; provide memory limit configurations in `docker-compose.yml`. |
| **A-04** | Photographic evidence is capped at 3 images and 5MB per image. | Inability to capture complex multi-angle disaster scenes. | Can be adjusted via environment variable (`MAX_EVIDENCE_FILES`, `MAX_FILE_SIZE_BYTES`) without schema changes. |

---

## 3. Unresolved Questions & Decision Log

| Question ID | Description | Current Working Decision | How It Will Be Resolved |
| :--- | :--- | :--- | :--- |
| **UQ-01** | Should citizens be permitted to withdraw or cancel a complaint after submission? | **No for Sprint 0–9.** Citizens can monitor status, but only administrators can transition to `REJECTED` with a note. | Discuss with municipal stakeholders before Sprint 4 frontend implementation. |
| **UQ-02** | What is the exact municipal retention period for resolved complaint images? | Default recommended period is **24 months** before archival. | Formulate local municipal record compliance rule during Sprint 9 security hardening. |
| **UQ-03** | What exact weight balance between geographic proximity and semantic text produces the optimal F1-score? | Provisional weights: $w_{\text{geo}} = 0.40, w_{\text{sem}} = 0.40, w_{\text{lex}} = 0.20$. | Will be empirically measured and calibrated against benchmark datasets in Sprint 8. |
