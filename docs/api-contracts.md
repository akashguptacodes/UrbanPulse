# UrbanPulse — API Contracts & Interface Specification
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. Overview and Design Conventions

This document specifies the RESTful API contracts for the **UrbanPulse Main Backend** (Node.js/Express) and the internal interfaces for the **AI Microservices** (FastAPI).

### Standard Response Envelope
All successful JSON responses from the main backend follow a uniform envelope structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```
*(The `meta` object is included on paginated list endpoints.)*

### Standard Error Envelope
All error responses adhere to a consistent error schema:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid complaint submission payload",
    "details": [
      {
        "field": "latitude",
        "issue": "Latitude must be between -90 and 90 degrees"
      }
    ]
  }
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Malformed syntax or invalid file upload.
- `401 Unauthorized`: Authentication missing, expired, or invalid.
- `403 Forbidden`: Authenticated user lacks required permissions.
- `404 Not Found`: Target resource does not exist.
- `409 Conflict`: Conflict with current state (e.g., email already registered).
- `422 Unprocessable Entity`: Request body failed semantic or schema validation.
- `500 Internal Server Error`: Unexpected server fault.
- `503 Service Unavailable`: Dependent service (e.g. database) temporarily unreachable.

---

## 2. Main Backend REST API Specification

### 2.1 Authentication & Session Endpoints (`/api/auth` and `/api/v1/auth`)

> **Sprint 2 Implementation Status:** Implemented & Verified with automated test suite. Both `/api/auth` and `/api/v1/auth` are active route aliases.

#### `POST /api/auth/register` (also `/api/v1/auth/register`)
- **Purpose:** Registers a new citizen account. Client-supplied roles are strictly ignored; all public registrations are assigned the `CITIZEN` role.
- **Required Role:** Public (Unauthenticated). Rate limited.
- **Request Body (JSON):**
  ```json
  {
    "email": "jane.citizen@example.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Citizen"
  }
  ```
- **Validation Rules:**
  - `email`: Valid email format, normalized to lowercase.
  - `password`: Minimum 8 characters, at least 1 number, 1 uppercase, 1 special character.
  - `full_name`: 2–100 characters.
  - `role`: Optional in registration; defaults to `'CITIZEN'`. Only initial setup scripts may seed `'ADMIN'`.
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e89b27b3-2e06-4b2a-89a7-89df317b6211",
        "email": "jane.citizen@example.com",
        "full_name": "Jane Citizen",
        "role": "CITIZEN",
        "created_at": "2026-10-22T14:30:00.000Z"
      }
    }
  }
  ```
- **Errors:** `400 Bad Request`, `409 Conflict` (`EMAIL_ALREADY_EXISTS`), `422 Unprocessable Entity`.

#### `POST /api/v1/auth/login`
- **Purpose:** Authenticates user and issues a secure `HttpOnly` session cookie.
- **Required Role:** Public (Unauthenticated).
- **Request Body (JSON):**
  ```json
  {
    "email": "jane.citizen@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Headers Set:** `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400; Secure`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e89b27b3-2e06-4b2a-89a7-89df317b6211",
        "email": "jane.citizen@example.com",
        "full_name": "Jane Citizen",
        "role": "CITIZEN"
      }
    }
  }
  ```
- **Errors:** `401 Unauthorized` (`INVALID_CREDENTIALS`), `429 Too Many Requests`.

#### `POST /api/v1/auth/logout`
- **Purpose:** Invalidate session and clears authentication cookie.
- **Required Role:** Authenticated (`CITIZEN` or `ADMIN`).
- **Headers Set:** `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": { "message": "Successfully logged out" }
  }
  ```

#### `GET /api/v1/auth/me`
- **Purpose:** Retrieves currently authenticated user profile.
- **Required Role:** Authenticated (`CITIZEN` or `ADMIN`).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e89b27b3-2e06-4b2a-89a7-89df317b6211",
        "email": "jane.citizen@example.com",
        "full_name": "Jane Citizen",
        "role": "CITIZEN"
      }
    }
  }
  ```
- **Errors:** `401 Unauthorized`.

---

### 2.2 Complaint Management Endpoints (`/api/v1/complaints`)

#### `POST /api/v1/complaints`
- **Purpose:** Submits a new civic complaint with optional photo evidence.
- **Required Role:** Authenticated `CITIZEN` (or `ADMIN`).
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `primary_category` (string, required): One of `POTHOLES`, `STREET_LIGHTS`, `GARBAGE`, `DISASTERS`.
  - `disaster_type` (string, optional): One of `FIRE`, `FLOOD`, `OTHER`. (Required if `primary_category == 'DISASTERS'`).
  - `title` (string, required): 5–150 characters.
  - `description` (string, required): 10–2000 characters.
  - `latitude` (number/string, required): -90.0000000 to +90.0000000.
  - `longitude` (number/string, required): -180.0000000 to +180.0000000.
  - `address_text` (string, optional): Human readable landmark or address.
  - `photos` (binary files, optional): Up to 3 image files (`.jpg`, `.png`, `.webp`, $\le 5\text{MB}$ each).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "complaint": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "citizen_id": "e89b27b3-2e06-4b2a-89a7-89df317b6211",
        "primary_category": "POTHOLES",
        "disaster_type": null,
        "title": "Severe pothole causing tire damage near crosswalk",
        "description": "Deep asphalt crater on right lane approximately 30cm deep. Vehicles swerving into oncoming traffic to avoid it.",
        "latitude": 37.7749295,
        "longitude": -122.4194155,
        "address_text": "Corner of 5th and Market St",
        "current_status": "SUBMITTED",
        "evidence": [
          {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "original_filename": "pothole_crosswalk.jpg",
            "mime_type": "image/jpeg",
            "file_size_bytes": 1420800,
            "uploaded_at": "2026-10-22T14:35:10.000Z"
          }
        ],
        "created_at": "2026-10-22T14:35:10.000Z"
      }
    }
  }
  ```
- **Errors:** `400 Bad Request` (Invalid file type/size), `422 Unprocessable Entity` (Schema validation failed).

#### `GET /api/v1/complaints`
- **Purpose:** Lists complaints with filtering, sorting, and pagination.
- **Access Policy:**
  - `CITIZEN`: Results automatically scoped to complaints where `citizen_id == current_user.id`.
  - `ADMIN`: Can view all complaints across the city.
- **Query Parameters:**
  - `page` (integer, optional, default: `1`).
  - `limit` (integer, optional, default: `20`, max: `100`).
  - `status` (string, optional): Filter by `SUBMITTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`.
  - `category` (string, optional): Filter by `POTHOLES`, `STREET_LIGHTS`, `GARBAGE`, `DISASTERS`.
  - `disaster_type` (string, optional): Filter by `FIRE`, `FLOOD`, `OTHER`.
  - `priority_band` (string, optional, Admin only): Filter by `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
  - `search` (string, optional): Substring search in title and description.
  - `sort_by` (string, optional, default: `created_at`): `created_at`, `priority_score`, `current_status`.
  - `sort_order` (string, optional, default: `desc`): `asc`, `desc`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "complaints": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "primary_category": "POTHOLES",
          "disaster_type": null,
          "title": "Severe pothole near crosswalk",
          "latitude": 37.7749295,
          "longitude": -122.4194155,
          "current_status": "SUBMITTED",
          "created_at": "2026-10-22T14:35:10.000Z",
          "priority_band": "HIGH",
          "has_duplicate_candidates": true
        }
      ]
    },
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### `GET /api/v1/complaints/:id`
- **Purpose:** Retrieves full complaint details, evidence list, and complete status timeline.
- **Required Role:** Authenticated (`CITIZEN` owner or any `ADMIN`).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "complaint": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "citizen_id": "e89b27b3-2e06-4b2a-89a7-89df317b6211",
        "citizen_name": "Jane Citizen",
        "primary_category": "POTHOLES",
        "disaster_type": null,
        "title": "Severe pothole causing tire damage near crosswalk",
        "description": "Deep asphalt crater on right lane approximately 30cm deep.",
        "latitude": 37.7749295,
        "longitude": -122.4194155,
        "address_text": "Corner of 5th and Market St",
        "current_status": "UNDER_REVIEW",
        "created_at": "2026-10-22T14:35:10.000Z",
        "updated_at": "2026-10-22T14:40:00.000Z",
        "evidence": [
          {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "original_filename": "pothole_crosswalk.jpg",
            "mime_type": "image/jpeg",
            "file_size_bytes": 1420800,
            "download_url": "/api/v1/complaints/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d/evidence/f47ac10b-58cc-4372-a567-0e02b2c3d479"
          }
        ],
        "status_history": [
          {
            "id": "b1a2c3d4-0000-0000-0000-111122223333",
            "previous_status": null,
            "new_status": "SUBMITTED",
            "reason_or_notes": "Complaint filed by citizen",
            "changed_by": "Jane Citizen",
            "created_at": "2026-10-22T14:35:10.000Z"
          },
          {
            "id": "c1a2c3d4-0000-0000-0000-111122224444",
            "previous_status": "SUBMITTED",
            "new_status": "UNDER_REVIEW",
            "reason_or_notes": "Accepted into public works queue",
            "changed_by": "Admin Officer Smith",
            "created_at": "2026-10-22T14:40:00.000Z"
          }
        ]
      }
    }
  }
  ```
- **Errors:** `403 Forbidden` (Citizen attempting to view another's complaint), `404 Not Found`.

#### `PATCH /api/v1/complaints/:id/status`
- **Purpose:** Updates complaint status and appends to status history and audit log.
- **Required Role:** Authenticated `ADMIN`.
- **Request Body (JSON):**
  ```json
  {
    "new_status": "IN_PROGRESS",
    "reason_or_notes": "Work crew dispatched (Unit 4B scheduled for pothole cold-mix repair)."
  }
  ```
- **Validation Rules:**
  - `new_status`: Must follow state machine transitions (`SUBMITTED` -> `UNDER_REVIEW` / `REJECTED`, etc.).
  - `reason_or_notes`: Optional for standard progression; strictly required if `new_status == 'REJECTED'`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "previous_status": "UNDER_REVIEW",
      "current_status": "IN_PROGRESS",
      "updated_at": "2026-10-22T15:00:00.000Z"
    }
  }
  ```
- **Errors:** `400 Bad Request` (Invalid state transition), `403 Forbidden` (Not an admin), `404 Not Found`.

#### `GET /api/v1/complaints/:id/evidence/:evidenceId`
- **Purpose:** Streams photographic evidence file securely.
- **Required Role:** Authenticated (`CITIZEN` owner or any `ADMIN`).
- **Response `200 OK`:** Binary stream with `Content-Type: image/jpeg` (or png/webp) and `X-Content-Type-Options: nosniff`.

---

### 2.3 AI Review & Inspection Endpoints (Admin Only)

#### `GET /api/v1/complaints/:id/duplicates`
- **Purpose:** Retrieves evaluated duplicate candidates with multi-signal score breakdowns.
- **Required Role:** Authenticated `ADMIN`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "execution_status": "COMPLETED",
      "evaluated_at": "2026-10-22T14:35:12.000Z",
      "candidates": [
        {
          "candidate_id": "99999999-8888-7777-6666-555544443333",
          "candidate_complaint_id": "c9b8a7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
          "candidate_title": "Huge road crater on 5th Ave",
          "candidate_status": "IN_PROGRESS",
          "geo_distance_meters": 24.5,
          "geo_score": 0.8367,
          "lexical_score": 0.6200,
          "semantic_score": 0.8845,
          "combined_score": 0.8125,
          "decision_recommendation": "POSSIBLE_DUPLICATE",
          "explanation": "High geographic proximity (24.5m away) and strong semantic similarity regarding pothole road crater.",
          "admin_reviewed": false,
          "admin_decision": "PENDING"
        }
      ]
    }
  }
  ```

#### `POST /api/v1/complaints/:id/duplicates/:candidateId/review`
- **Purpose:** Records administrative decision on a duplicate candidate.
- **Required Role:** Authenticated `ADMIN`.
- **Request Body (JSON):**
  ```json
  {
    "decision": "CONFIRMED_DUPLICATE",
    "notes": "Verified same pothole location at 5th St crosswalk."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "candidate_id": "99999999-8888-7777-6666-555544443333",
      "admin_decision": "CONFIRMED_DUPLICATE",
      "reviewed_at": "2026-10-22T15:10:00.000Z"
    }
  }
  ```

#### `GET /api/v1/complaints/:id/priority`
- **Purpose:** Retrieves priority assessment, risk factors, safety flags, and explanations.
- **Required Role:** Authenticated `ADMIN`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "priority_score": 76.5,
      "priority_band": "HIGH",
      "safety_override": false,
      "detected_factors": [
        {
          "factor": "TRAFFIC_HAZARD",
          "matched_term": "swerving into oncoming traffic",
          "severity_contribution": 35.0
        },
        {
          "factor": "STRUCTURAL_DAMAGE_EXTENT",
          "matched_term": "30cm deep",
          "severity_contribution": 25.0
        }
      ],
      "explanation": "Elevated priority due to reported traffic swerving risk and deep crater dimensions.",
      "rule_or_model_version": "rules-v1.0.0",
      "admin_reviewed": false,
      "admin_override_band": null
    }
  }
  ```

#### `PATCH /api/v1/complaints/:id/priority/override`
- **Purpose:** Allows administrator to manually correct the advisory priority band.
- **Required Role:** Authenticated `ADMIN`.
- **Request Body (JSON):**
  ```json
  {
    "admin_override_band": "CRITICAL",
    "reason": "Immediate hazard: arterial road with heavy bus transit."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "original_band": "HIGH",
      "effective_priority_band": "CRITICAL",
      "admin_reviewed": true,
      "reviewed_at": "2026-10-22T15:15:00.000Z"
    }
  }
  ```

---

### 2.4 Administrative Dashboard & System Endpoints

#### `GET /api/v1/admin/stats`
- **Purpose:** Returns aggregate civic metrics for the administrative dashboard.
- **Required Role:** Authenticated `ADMIN`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "total_complaints": 342,
      "by_status": {
        "SUBMITTED": 45,
        "UNDER_REVIEW": 28,
        "IN_PROGRESS": 64,
        "RESOLVED": 185,
        "REJECTED": 20
      },
      "by_category": {
        "POTHOLES": 142,
        "STREET_LIGHTS": 88,
        "GARBAGE": 95,
        "DISASTERS": 17
      },
      "by_priority": {
        "CRITICAL": 12,
        "HIGH": 68,
        "MEDIUM": 172,
        "LOW": 90
      },
      "average_resolution_hours": 36.4
    }
  }
  ```

#### `GET /api/v1/health`
- **Purpose:** Backend health status and DB connection connectivity probe.
- **Required Role:** Public.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-22T14:40:00.000Z",
    "services": {
      "database": "connected",
      "duplicate_ai_service": "reachable",
      "priority_ai_service": "reachable"
    }
  }
  ```

---

## 3. Internal AI Microservice API Contracts (FastAPI)

*Note:* These endpoints are bound to the internal Docker network and are **not** accessible to public clients.

### 3.1 Duplicate Service Contract (`:8001`)

#### `POST /api/v1/duplicates/evaluate`
- **Purpose:** Evaluates an incoming complaint against candidate complaints within the same category.
- **Request Body (JSON):**
  ```json
  {
    "target_complaint": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "primary_category": "POTHOLES",
      "description": "Deep asphalt crater on right lane approximately 30cm deep. Vehicles swerving.",
      "latitude": 37.7749295,
      "longitude": -122.4194155
    },
    "candidate_pool": [
      {
        "id": "c9b8a7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
        "primary_category": "POTHOLES",
        "description": "Huge pothole in the road near crosswalk, cars dodging it.",
        "latitude": 37.7751500,
        "longitude": -122.4193000
      }
    ],
    "max_distance_meters": 150.0
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "target_complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "evaluated_candidates_count": 1,
    "matches": [
      {
        "candidate_id": "c9b8a7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
        "geo_distance_meters": 26.3,
        "geo_score": 0.8247,
        "lexical_score": 0.5830,
        "semantic_score": 0.8712,
        "combined_score": 0.7952,
        "decision_recommendation": "POSSIBLE_DUPLICATE",
        "explanation": "Very close proximity (26.3m) with high semantic text alignment."
      }
    ]
  }
  ```
- **Special Case:** When `candidate_pool` is empty, returns:
  ```json
  {
    "target_complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "evaluated_candidates_count": 0,
    "matches": []
  }
  ```

#### `GET /health`
- **Response `200 OK`:** `{"status": "ok", "service": "duplicate_service", "model": "all-MiniLM-L6-v2"}`

---

### 3.2 Priority Service Contract (`:8002`)

#### `POST /api/v1/priority/assess`
- **Purpose:** Computes severity score, priority band, and safety overrides for a complaint.
- **Request Body (JSON):**
  ```json
  {
    "complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "primary_category": "DISASTERS",
    "disaster_type": "FIRE",
    "description": "Active electrical transformer fire sparking violently next to residential apartment building."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "complaint_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "priority_score": 98.0,
    "priority_band": "CRITICAL",
    "safety_override": true,
    "detected_factors": [
      {
        "factor": "IMMEDIATE_LIFE_HAZARD",
        "matched_term": "transformer fire sparking violently",
        "severity_contribution": 50.0
      },
      {
        "factor": "RESIDENTIAL_EXPOSURE",
        "matched_term": "apartment building",
        "severity_contribution": 25.0
      }
    ],
    "explanation": "EMERGENCY SAFETY OVERRIDE: Active fire hazard adjacent to residential dwellings.",
    "rule_version": "rules-v1.0.0"
  }
  ```

#### `GET /health`
- **Response `200 OK`:** `{"status": "ok", "service": "priority_service", "rule_version": "rules-v1.0.0"}`
