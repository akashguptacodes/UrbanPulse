# UrbanPulse — Sprint Roadmap & Implementation Plan
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. Roadmap Overview & Phasing Strategy

The UrbanPulse platform will be constructed methodically across ten distinct sprints (Sprint 0 through Sprint 9). Each sprint possesses a well-defined boundary, explicit input dependencies, concrete deliverables, and measurable acceptance criteria.

```
Sprint 0 ──► Sprint 1 ──► Sprint 2 ──► Sprint 3 ──► Sprint 4
(Arch/Docs)   (Scaffold)   (DB & Auth)  (Complaint)  (Frontend)
                                                         │
                                                         ▼
Sprint 9 ◄── Sprint 8 ◄── Sprint 7 ◄── Sprint 6 ◄── Sprint 5
(Hardening)   (Eval/Test)  (AI Integ)   (Priority)   (Duplicate)
```

---

## 2. Sprint-by-Sprint Implementation Specifications

---

### Sprint 0: Requirements, System Architecture and Project Blueprint (Current)
- **Objective:** Establish comprehensive requirements, architecture, data schemas, API contracts, AI designs, and project roadmap without generating production application code.
- **Scope:**
  - System architecture and service boundaries.
  - Relational database entity-relationship design.
  - REST and internal AI API contracts.
  - AI duplicate detection and priority scoring methodologies.
  - Security, authentication, and privacy frameworks.
  - Root README and implementation roadmap.
- **Dependencies:** None (Greenfield project).
- **Deliverables:**
  - 9 core documentation files in `docs/`.
  - Root `README.md` with project index and roadmap.
- **Acceptance Criteria:**
  - All 9 required docs exist and provide detailed, actionable specifications.
  - The 4 primary complaint categories are fixed and uniform across all documents.
  - No CNN, image classifier, or image-embedding pipeline is introduced.
  - No application code, database migrations, or dependencies installed.
- **Out-of-Scope:** Application code, package installation, Docker containers, database migrations.
- **Major Risks:** Incomplete specifications causing ambiguities in future sprints.

---

### Sprint 1: Repository Setup & Development Environment
- **Objective:** Initialize the monorepo workspace, developer tooling, linting/formatting standards, and containerized local development environment.
- **Scope:**
  - Monorepo folder initialization (`frontend`, `backend`, `ai-services`, `infra`).
  - Git configuration, `.gitignore`, and workspace settings.
  - TypeScript, ESLint, and Prettier configurations for `frontend` and `backend`.
  - Python virtual environment, `pytest`, and linting standards for AI microservices.
  - Initial `docker-compose.yml` defining PostgreSQL 16 container and shared network.
- **Dependencies:** Sprint 0 documentation sign-off.
- **Deliverables:**
  - Root and service `package.json` and `requirements.txt` manifests.
  - Working `docker-compose.yml` for local PostgreSQL and network bridge.
  - Verified lint and build scripts (`npm run lint`, `pytest`).
- **Acceptance Criteria:**
  - Running `docker compose up postgres` launches a healthy PostgreSQL 16 instance.
  - Frontend, backend, and AI service directories build cleanly with zero lint errors.
- **Out-of-Scope:** Database tables, business logic, endpoints, UI components.
- **Major Risks:** Incompatible node or python versions across developer machines (mitigated via Docker and `.nvmrc`).

---

### Sprint 2: Database Schema & Authentication Backend
- **Objective:** Establish the persistent database schema using Prisma ORM and implement complete user authentication and RBAC in the Express backend.
- **Scope:**
  - Prisma schema definition for `User` and `AuditLog`.
  - Initial database migration generation and seeding script (default admin user).
  - Registration, login, logout, and `/me` routes in Express.
  - Password hashing with `bcrypt` (12 rounds).
  - JWT token generation and verification via `HttpOnly`, `SameSite=Lax` cookies.
  - Role-based authorization middleware (`requireAuth`, `requireRole`).
- **Dependencies:** Sprint 1 environment setup.
- **Deliverables:**
  - Prisma schema file and initial SQL migration.
  - Express authentication router, controllers, and middleware.
  - Automated integration tests for authentication workflows.
- **Acceptance Criteria:**
  - User can register, log in, receive a secure cookie, access `/me`, and log out.
  - Unauthenticated requests to protected routes return `401 Unauthorized`.
  - Citizen tokens cannot access admin routes (returns `403 Forbidden`).
  - Passwords are never returned in responses or stored in plaintext.
- **Out-of-Scope:** Complaint entities, file upload, AI microservices.
- **Major Risks:** Cookie security issues across different local ports (mitigated by configuring CORS credentials and local proxy).

---

### Sprint 3: Complaint Management Backend
- **Objective:** Implement full complaint CRUD, photographic evidence ingestion, and status lifecycle state machine in the Express backend.
- **Scope:**
  - Prisma schemas and migrations for `Complaint`, `ComplaintEvidence`, and `ComplaintStatusHistory`.
  - Multipart form upload middleware with Multer (MIME whitelist, size checks, UUID naming).
  - Local disk storage abstraction (`LocalStorageService`).
  - Endpoints: `POST /api/v1/complaints`, `GET /api/v1/complaints`, `GET /api/v1/complaints/:id`, `PATCH /api/v1/complaints/:id/status`.
  - Enforced status lifecycle state transitions and immutable history logging.
  - Zod validation for categories, coordinates, and description length.
- **Dependencies:** Sprint 2 authentication backend.
- **Deliverables:**
  - Complaint service, controllers, routes, and validators.
  - File upload handler with EXIF data stripping and safe file serving.
  - Integration tests for complaint creation, retrieval, and status transitions.
- **Acceptance Criteria:**
  - Citizens can submit complaints with up to 3 valid image files.
  - Non-image files or files > 5MB are rejected with clear 400 errors.
  - Citizens can only query their own complaints; admins can query all.
  - Only admins can transition statuses; illegal transitions return `400 Bad Request`.
- **Out-of-Scope:** AI duplicate evaluation, AI priority scoring, frontend UI.
- **Major Risks:** Disk storage exhaustion or unhandled file write failures (mitigated with storage quotas and error handling).

---

### Sprint 4: Frontend Web Application & Backend Integration
- **Objective:** Construct the responsive React web application with complete citizen and administrator user interfaces connected to the backend API.
- **Scope:**
  - React application foundation with Vite, TypeScript, and Tailwind CSS.
  - Centralized API client layer with Axios and error handling.
  - Authentication views: Login and Registration.
  - Citizen views: Citizen Dashboard, Complaint Submission Form (with coordinate entry and file upload), Complaint Details with timeline.
  - Administrator views: Admin Dashboard with complaint filtering/pagination, Complaint Details, and Status Update modal.
  - Visual distinction of the 4 primary categories and disaster types.
  - Form validation using React Hook Form and Zod.
- **Dependencies:** Sprint 3 complaint backend.
- **Deliverables:**
  - Responsive web application covering all citizen and admin flows.
  - Component tests for forms and route guards.
- **Acceptance Criteria:**
  - Citizens can log in, submit complaints with photos, and view status history.
  - Admins can log in, filter complaints by category/status, and update statuses.
  - Mobile-responsive layout tested down to 375px viewport width.
  - Disasters category displays prominent emergency dispatch guidance banner.
- **Out-of-Scope:** AI duplicate review UI, priority inspection badges (handled in Sprint 7).
- **Major Risks:** UI state synchronization mismatches with backend status state machine.

---

### Sprint 5: Duplicate Detection AI Microservice
- **Objective:** Develop the standalone Python FastAPI duplicate detection service implementing the multi-signal algorithm.
- **Scope:**
  - FastAPI application structure (`ai-services/duplicate_service`).
  - Signal A: Haversine distance calculator with normalized proximity score.
  - Signal B: TF-IDF vectorizer and cosine similarity calculator for complaint text.
  - Signal C: Sentence-Transformers integration using local `all-MiniLM-L6-v2` model.
  - Signal D: Weighted combiner and decision band classifier (`POSSIBLE_DUPLICATE` vs `UNLIKELY_DUPLICATE`).
  - Human-readable explanation generation.
  - Endpoint `POST /api/v1/duplicates/evaluate` and `/health`.
- **Dependencies:** Sprint 1 environment setup.
- **Deliverables:**
  - Functional FastAPI duplicate detection service with Pydantic contracts.
  - Unit tests verifying distance calculations, text similarity, and empty candidate handling.
- **Acceptance Criteria:**
  - Service loads `all-MiniLM-L6-v2` locally on CPU without external API calls.
  - Correctly evaluates candidate pools and returns structured scores and explanations.
  - Empty candidate pool returns 200 OK with empty matches array.
  - Average evaluation latency $< 1.5$ seconds for candidate pools of up to 25 items.
- **Out-of-Scope:** Priority scoring, backend integration, direct database queries.
- **Major Risks:** High memory consumption during Sentence-Transformer model load (mitigated by selecting lightweight 80MB MiniLM).

---

### Sprint 6: Priority Assessment AI Microservice
- **Objective:** Develop the standalone Python FastAPI severity and priority assessment service implementing rule-based hazard extraction and safety overrides.
- **Scope:**
  - FastAPI application structure (`ai-services/priority_service`).
  - Keyword and phrase extraction engine for safety hazards, damage extent, and transit impact.
  - Configurable weighted factor scoring engine ($0 \dots 100$).
  - Priority band mapper (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - Deterministic emergency safety override rules (forcing `CRITICAL`).
  - Human-readable explanation generator distinguishing citizen text from inferred factors.
  - Endpoint `POST /api/v1/priority/assess` and `/health`.
- **Dependencies:** Sprint 1 environment setup.
- **Deliverables:**
  - Functional FastAPI priority service with Pydantic schemas.
  - Comprehensive unit tests for factor extraction, scoring bounds, and safety overrides.
- **Acceptance Criteria:**
  - Text containing active fires, live wires, or major flooding triggers `CRITICAL` safety override.
  - Returns scores normalized between 0.0 and 100.0 without invalid boundaries.
  - Service executes statelessly without database or external network access.
  - Latency $< 200\text{ms}$ on standard CPU.
- **Out-of-Scope:** Machine learning model training, duplicate detection, backend integration.
- **Major Risks:** Overly aggressive keyword matching causing false-positive critical overrides (mitigated by context-aware phrase patterns).

---

### Sprint 7: AI and Backend Integration
- **Objective:** Connect the main Express backend to both AI microservices, orchestrate asynchronous evaluations, persist AI results, and deliver administrative review interfaces.
- **Scope:**
  - Backend `aiService` client with HTTP request timeouts (2000ms for duplicate, 1500ms for priority) and graceful degradation on failure.
  - Automatic AI evaluation trigger upon complaint submission.
  - Prisma models and migrations for `DuplicateDetectionResult`, `DuplicateCandidate`, and `PriorityAssessment`.
  - Backend endpoints:
    - `GET /api/v1/complaints/:id/duplicates`
    - `POST /api/v1/complaints/:id/duplicates/:candidateId/review`
    - `GET /api/v1/complaints/:id/priority`
    - `PATCH /api/v1/complaints/:id/priority/override`
  - Frontend Admin UI additions:
    - Side-by-side duplicate candidate comparison panel with multi-signal score bars.
    - Duplicate confirmation and dismissal actions.
    - Priority inspection drawer detailing detected factors and manual override controls.
- **Dependencies:** Sprints 3, 4, 5, and 6.
- **Deliverables:**
  - Complete end-to-end integration between Backend, AI services, and Database.
  - Administrative review UI for duplicates and priority.
- **Acceptance Criteria:**
  - Filing a complaint automatically triggers AI evaluations and saves scores to PostgreSQL.
  - If an AI service is down, complaint creation succeeds with status `SUBMITTED` and AI state flagged as `FAILED`.
  - Admins can inspect duplicate scores and confirm duplicates with an audit trail.
  - Admins can override priority bands with mandatory justification notes.
- **Out-of-Scope:** Production deployment, extensive model benchmarking.
- **Major Risks:** AI service latency delaying backend HTTP response (mitigated by asynchronous evaluation or strict 2s timeouts).

---

### Sprint 8: Comprehensive Testing & AI Evaluation
- **Objective:** Validate end-to-end software correctness, measure AI algorithm performance against benchmark datasets, and verify security posture.
- **Scope:**
  - End-to-end tests covering citizen complaint filing, AI scoring, admin triage, and resolution.
  - Backend unit and integration test suite (achieving $>80\%$ business logic coverage).
  - Frontend component and workflow tests.
  - AI evaluation suite for duplicate detection (measuring Precision, Recall, F1 on synthetic/curated test cases).
  - AI evaluation suite for priority scoring (measuring safety override recall and agreement).
  - Security audit: Rate limiting, SQL injection probes, XSS testing, and file upload tampering.
- **Dependencies:** Sprint 7 integrated system.
- **Deliverables:**
  - Automated test suites across all services.
  - AI Evaluation Report documenting precision, recall, and edge case behaviors.
- **Acceptance Criteria:**
  - 100% of emergency safety override test scenarios trigger `CRITICAL` priority.
  - No critical or high-severity vulnerabilities identified in security scans.
  - All automated tests pass consistently in local and CI environments.
- **Out-of-Scope:** Infrastructure deployment, domain configuration.
- **Major Risks:** Identification of subtle duplicate detection edge cases requiring threshold calibration.

---

### Sprint 9: Security Hardening, Dockerization & Production Readiness
- **Objective:** Finalize production-grade container orchestration, enforce security hardening, document deployment runbooks, and verify system stability.
- **Scope:**
  - Production multi-stage `Dockerfile` definitions for `frontend`, `backend`, and `ai-services`.
  - Production `docker-compose.prod.yml` with health checks, restart policies, and resource constraints.
  - Security header hardening, production CORS policies, and environment variable audits.
  - Database backup and recovery scripts.
  - Complete operations and administrator user manuals in `docs/`.
  - Final project verification against all initial Sprint 0 specifications.
- **Dependencies:** Sprint 8 testing and validation.
- **Deliverables:**
  - Production container configuration and deployment runbook.
  - Final documentation update and system verification report.
- **Acceptance Criteria:**
  - Entire platform starts cleanly with a single `docker compose -f docker-compose.prod.yml up` command.
  - Health check endpoints across all services report healthy status.
  - Full end-to-end flow verified in production container mode.
- **Out-of-Scope:** Commercial cloud infrastructure provisioning (AWS/GCP accounts).
- **Major Risks:** Container resource exhaustion when running Sentence Transformers alongside Postgres on limited RAM hosts (mitigated via memory limits).
