# UrbanPulse 🏙️
### AI-Assisted Civic Issue Reporting & Complaint Management Platform

> [!NOTE]
> **CURRENT PROJECT STATUS: SPRINT 4 (FRONTEND DEVELOPMENT & BACKEND INTEGRATION COMPLETED)**  
> Complete responsive React 18 frontend with TypeScript, Vite, Tailwind CSS, and React Router connected to the Express backend. Features role-scoped complaint listing with live filtering and pagination, complaint submission with four fixed categories and conditional disaster subtypes, accessible coordinate input, complaint detail with audit timeline, and admin status management console. 17 frontend unit and integration tests passing. Ready for Sprint 5 (Duplicate Detection AI Microservice).

---

## 1. Project Overview

**UrbanPulse** is a modern civic issue reporting and complaint management platform designed to empower citizens and streamline municipal operations.

- **For Citizens:** A clean, mobile-responsive web application to submit localized civic complaints (potholes, damaged streetlights, illegal garbage dumping, civic disasters), attach photographic evidence, specify GPS coordinates, and track resolution timelines with full transparency.
- **For Municipal Administrators:** A triage console featuring automated, explainable AI recommendations that detect duplicate complaints in the same vicinity and evaluate complaint urgency using rule-based severity scoring and safety overrides.
- **Explainable & Safe:** All AI recommendations operate in an advisory capacity (human-in-the-loop). High scores never trigger automated merges or rejections without human review.

---

## 2. Fixed Functional Scope & Taxonomy

UrbanPulse operates on a strictly fixed taxonomy of **four primary categories**:

| Category Key | Category Name | Scope Description |
| :--- | :--- | :--- |
| `POTHOLES` | Potholes & Road Surface | Craters, cracked asphalt, sunken surfaces posing hazards to vehicles and pedestrians. |
| `STREET_LIGHTS` | Street Lighting | Broken streetlights, flickering fixtures, unlit dark corridors, day-burning fixtures. |
| `GARBAGE` | Garbage & Sanitation | Overflowing public dumpsters, illegal trash dumping, uncollected curbside waste. |
| `DISASTERS` | Civic Emergencies & Disasters | Severe public hazards. Supports an extensible `disaster_type` field (`FIRE`, `FLOOD`, `OTHER`). |

> [!NOTE]
> Photographic attachments serve strictly as human evidence for administrative inspection. Computer vision pipelines (CNNs, image classifiers, visual embeddings) are explicitly excluded to keep the architecture simple, transparent, and local-first.

---

## 3. Technology Stack & Runtime Versions

| Service | Technology Stack | Supported Runtimes | Local Port |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, Vitest | Node.js `>=20.0.0` (Tested `v22.15.1`), npm `>=10.0.0` | `5173` |
| **Backend** | Node.js 20+, Express, TypeScript, Zod, Helmet, CORS, Vitest | Node.js `>=20.0.0` (Tested `v22.15.1`), npm `>=10.0.0` | `4000` |
| **Duplicate Service** | Python 3.11+, FastAPI, Uvicorn, Pydantic Settings, Pytest | Python `>=3.11.0` (Tested `3.13.3`), pip `>=24.0.0` | `8001` |
| **Priority Service** | Python 3.11+, FastAPI, Uvicorn, Pydantic Settings, Pytest | Python `>=3.11.0` (Tested `3.13.3`), pip `>=24.0.0` | `8002` |

---

## 4. Monorepo Structure

```
UrbanPulse/
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── layouts/         # Responsive layouts (RootLayout)
│   │   ├── pages/           # LoginPage, RegisterPage, DevStatusPage, NotFoundPage
│   │   ├── services/        # Axios API client (apiClient.ts, authApi.ts)
│   │   ├── context/         # AuthContext
│   │   ├── App.tsx          # React Router setup
│   │   ├── main.tsx         # DOM entrypoint
│   │   └── index.css        # Tailwind directives
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                  # Node.js + Express + TypeScript
│   ├── prisma/              # Prisma schema & SQL migrations
│   │   ├── schema.prisma    # Models: User, AuditLog, Complaint, ComplaintEvidence, ComplaintStatusHistory
│   │   └── migrations/      # Version-controlled migrations
│   ├── src/
│   │   ├── config/          # Zod-validated environment config (env.ts)
│   │   ├── controllers/     # authController.ts, complaintController.ts
│   │   ├── middleware/      # authMiddleware, errorHandler, notFoundHandler, rateLimiter
│   │   ├── repositories/    # prisma.ts, userRepository.ts, complaintRepository.ts
│   │   ├── routes/          # health.ts, auth.ts, complaints.ts
│   │   ├── services/        # authService.ts, complaintService.ts, statusTransitionPolicy.ts, storageService.ts
│   │   ├── types/           # auth.ts, complaint.ts
│   │   ├── validators/      # authValidators.ts, complaintValidators.ts
│   │   ├── app.ts           # Express app factory (helmet, cors, routes)
│   │   └── server.ts        # Server entry with graceful shutdown
│   ├── tests/               # Vitest + Supertest endpoint tests (complaint.test.ts)
│   ├── package.json
│   └── tsconfig.json
├── ai-services/
│   ├── duplicate_service/    # Python FastAPI duplicate detection scaffold
│   └── priority_service/     # Python FastAPI priority assessment scaffold
├── infra/
│   └── docker/              # Containerization roadmap & documentation
├── docs/                    # Complete architectural blueprints & runbooks
├── .editorconfig            # Monorepo whitespace & formatting conventions
├── .gitignore               # Ignored artifacts (node_modules, venvs, env files)
├── .env.example             # Non-secret environment template
├── package.json             # Root monorepo script orchestration
└── README.md                # Project documentation root
```

---

## 5. Quickstart & Development Commands

### Step 1: Per-Service Environment Setup
Each of the 4 services maintains its own isolated `.env` configuration file for standalone deployment:
```bash
# Frontend Service
cp frontend/.env.example frontend/.env

# Backend API Service
cp backend/.env.example backend/.env

# AI Microservices (FastAPI)
cp ai-services/priority_service/.env.example ai-services/priority_service/.env
cp ai-services/duplicate_service/.env.example ai-services/duplicate_service/.env
```

### Step 2: Install Dependencies & Setup Database
```bash
# Backend dependencies & Prisma Client generation
cd backend && npm install && npm run db:generate && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..

# Apply database migrations (when DATABASE_URL is set in .env)
npm run db:migrate:deploy
```

### Step 3: Run Services in Separate Terminals
- **Backend API:** `cd backend && npm run dev`  
  *(Listens on [http://localhost:4000](http://localhost:4000))*
- **Frontend UI:** `cd frontend && npm run dev`  
  *(Listens on [http://localhost:5173](http://localhost:5173))*
- **Duplicate Service:** `cd ai-services/duplicate_service && .\venv\Scripts\uvicorn app.main:app --port 8001 --reload`  
  *(Listens on [http://127.0.0.1:8001](http://127.0.0.1:8001))*
- **Priority Service:** `cd ai-services/priority_service && .\venv\Scripts\uvicorn app.main:app --port 8002 --reload`  
  *(Listens on [http://127.0.0.1:8002](http://127.0.0.1:8002))*

### Implemented Frontend Pages & Routing
- `/` — **Landing Page:** Civic issue overview, 4 categories, emergency subtype explanations, and role-aware CTAs.
- `/register` — **Registration:** Citizen account registration with client and backend validation.
- `/login` — **Login:** Authentication with HttpOnly cookie session management and destination redirect.
- `/complaints` — **Complaint Queue:** Role-scoped complaint listings (citizens see their reports; admins see citywide reports) with filtering by category, status, conditional disaster subtype, text search, and pagination.
- `/complaints/new` — **Report Complaint:** Category selection, dynamic disaster emergency subtypes (`FIRE`, `FLOOD`, `OTHER`), manual coordinate entry + browser geolocation helper, and duplicate submission prevention.
- `/complaints/:id` — **Complaint Details:** Full issue metadata, location coordinates, audit history timeline, and administrator status transition console.
- `*` — **Not Found Page:** 404 error page with navigation back to home.

### Intentionally Deferred Features Notice
- **Evidence / Photo File Uploads:** Photographic file uploads are deferred per Sprint 0 & 3 boundaries. An honest notice is displayed on the complaint form; no fake multipart uploads or placeholder files are sent.
- **AI Microservices Integration:** The Duplicate Detection and Priority Assessment microservices run as standalone services in Python; administrative review UI integration is scheduled for Sprint 7.

### Available Endpoints Summary
- **Health:** `GET http://localhost:4000/api/health`
- **Auth:**
  - Register: `POST http://localhost:4000/api/auth/register`
  - Login: `POST http://localhost:4000/api/auth/login`
  - Current User: `GET http://localhost:4000/api/auth/me`
  - Logout: `POST http://localhost:4000/api/auth/logout`
- **Complaints (`/api/complaints` and `/api/v1/complaints`):**
  - Create Complaint: `POST http://localhost:4000/api/complaints` (Authenticated)
  - List Complaints: `GET http://localhost:4000/api/complaints?page=1&limit=20` (Citizen sees own, Admin sees all)
  - Complaint Detail: `GET http://localhost:4000/api/complaints/:id` (Authenticated Owner or Admin)
  - Update Status: `PATCH http://localhost:4000/api/complaints/:id/status` (Admin only)

---

## 6. Testing & Quality Verification

Run tests, linting, and builds across all services:

```bash
# Frontend tests (17 automated unit and integration tests)
cd frontend && npm test

# Frontend linting & type-checking / production build
cd frontend && npm run lint
cd frontend && npm run build

# Backend tests (28 automated unit and route integration tests)
cd backend && npm test

# Backend linting & type-checking / build
cd backend && npm run lint
cd backend && npm run build

# Test Python AI services
cd ai-services/duplicate_service && pytest tests/
cd ai-services/priority_service && pytest tests/
```

For detailed onboarding instructions, refer to [**`docs/development-setup.md`**](file:///d:/UrbanPulse/docs/development-setup.md).

---

## 7. Documentation Index

The complete technical blueprint is documented across the [`docs/`](file:///d:/UrbanPulse/docs) directory:

1. [**Requirements Specification (`docs/requirements.md`)**](file:///d:/UrbanPulse/docs/requirements.md)
2. [**System Architecture (`docs/architecture.md`)**](file:///d:/UrbanPulse/docs/architecture.md)
3. [**Database Design (`docs/database-design.md`)**](file:///d:/UrbanPulse/docs/database-design.md)
4. [**API Contracts (`docs/api-contracts.md`)**](file:///d:/UrbanPulse/docs/api-contracts.md)
5. [**AI Systems Design (`docs/ai-design.md`)**](file:///d:/UrbanPulse/docs/ai-design.md)
6. [**Security & Privacy (`docs/security-and-privacy.md`)**](file:///d:/UrbanPulse/docs/security-and-privacy.md)
7. [**Sprint Implementation Roadmap (`docs/sprint-roadmap.md`)**](file:///d:/UrbanPulse/docs/sprint-roadmap.md)
8. [**Architectural Decisions & ADRs (`docs/decisions.md`)**](file:///d:/UrbanPulse/docs/decisions.md)
9. [**Testing & AI Evaluation Strategy (`docs/testing-strategy.md`)**](file:///d:/UrbanPulse/docs/testing-strategy.md)
10. [**Developer Setup Guide (`docs/development-setup.md`)**](file:///d:/UrbanPulse/docs/development-setup.md)

---

## 8. Sprint Roadmap Summary

- **Sprint 0:** Requirements, System Architecture and Project Blueprint *(Done)*
- **Sprint 1:** Monorepo Setup & Development Environment *(Done)*
- **Sprint 2:** Database Schema & Authentication Backend *(Done)*
- **Sprint 3:** Complaint Management Backend & File Uploads *(Done)*
- **Sprint 4:** Frontend Web Application & Backend Integration *(Done)*
- **Sprint 5:** Duplicate Detection AI Microservice *(Next)*
- **Sprint 6:** Priority Assessment AI Microservice
- **Sprint 7:** AI and Backend Integration & Administrative Review UI
- **Sprint 8:** Comprehensive Testing & AI Evaluation
- **Sprint 9:** Security Hardening, Dockerization & Production Readiness
