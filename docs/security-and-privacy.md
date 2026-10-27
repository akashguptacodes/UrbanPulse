# UrbanPulse — Security, Privacy & Reliability Specification
**Sprint 0: Requirements, System Architecture and Project Blueprint**
*Document Version: 1.0.0*

---

## 1. Threat Modeling & Security Principles

Civic issue reporting platforms manage sensitive community data, geographic location information, photographic evidence, and administrative decision trails. 

UrbanPulse implements defense-in-depth across the application lifecycle based on these core principles:
1. **Server-Derived Identity:** The client is never trusted to assert user roles, citizen IDs, or permissions.
2. **Zero-Trust AI Integration:** Internal AI microservices run in a restricted private network, accept validated payloads, and hold zero direct database credentials.
3. **Data Minimization & Privacy by Default:** Collect only information strictly necessary for civic triage, strip tracking metadata, and protect citizen identity.
4. **Resilient Failure Isolation:** Service failures or timeouts in non-critical components (such as AI scoring) must fail safely without degrading core submission availability.

---

## 2. Authentication & Session Security

### 2.1 Password Hashing & Storage
- User passwords are encrypted using `bcrypt` with a work factor of 12.
- Plaintext passwords are never persisted, cached, logged, or echoed back in API responses.
- Implemented and verified via automated test suite.

### 2.2 Token & Session Strategy
- **Token Format:** Cryptographically signed JSON Web Tokens (JWT) signed with `JWT_SECRET` (minimum 16-32 character entropy).
- **Delivery Mechanism:** Delivered exclusively via HTTP response headers using `Set-Cookie` (`token` cookie) with the following attributes:
  - `HttpOnly`: Prevents client-side JavaScript access, mitigating Cross-Site Scripting (XSS) token exfiltration.
  - `Secure`: Set to true in production (`process.env.NODE_ENV === 'production'`) ensuring cookies transmit only over HTTPS.
  - `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF) for standard cross-origin navigation.
  - `Path=/`: Restricts token usage to the root domain path.
  - `Max-Age`: Configured for 7 days (`7 * 24 * 60 * 60 * 1000` ms).
- **Logout Behavior:** The `/api/auth/logout` endpoint clears the cookie header with an expired epoch timestamp (`Expires=Thu, 01 Jan 1970 00:00:00 GMT`), invalidating the client session.
- **Credential Masking:** Database connection strings are masked via `sanitizeDatabaseUrl()` before any logging, protecting credentials in Cloud/Neon setups.

---

## 3. Authorization & Role-Based Access Control (RBAC)

The system enforces strict server-side middleware for every non-public route:

```
[Incoming Request]
       │
       ▼
[requireAuth Middleware]
       │ 1. Extracts JWT from HttpOnly cookie
       │ 2. Cryptographically verifies signature and expiry
       │ 3. Attaches verified user payload to `req.user`
       ▼
[requireRole(role) Middleware]
       │ Checks if req.user.role matches required permissions
       ▼
[Controller Resource Ownership Check]
       │ (For Citizens: enforces `complaint.citizen_id === req.user.id`)
       ▼
[Database Transaction / Business Logic]
```

### 3.1 Permission Matrix

| Operation / Resource | Unauthenticated | `CITIZEN` Role | `ADMIN` Role | Enforcement Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| Register / Login | Allowed | N/A | N/A | Public endpoints with strict rate limiting. |
| Submit Complaint | Denied (401) | Allowed | Allowed | `requireAuth` |
| View Own Complaints | Denied (401) | Allowed | Allowed | `requireAuth` + SQL `WHERE citizen_id = req.user.id` |
| View Other Citizen's Complaint | Denied (401) | **Denied (404)** | Allowed | Ownership check in complaint service. Returning 404 prevents existence leakage and ID probing. |
| Update Complaint Status | Denied (401) | **Denied (403)** | Allowed | `requireRole('ADMIN')` + Centralized `statusTransitionPolicy`. |
| Review AI Duplicates & Priority | Denied (401) | **Denied (403)** | Allowed | `requireRole('ADMIN')` |
| View Admin Stats & Audit Logs | Denied (401) | **Denied (403)** | Allowed | `requireRole('ADMIN')` |

---

## 4. Input Validation & Defense Against Injection

1. **Strict Zod Schemas:** Every request body, URL parameter, and query parameter is passed through strict Zod validators prior to controller execution. Extraneous fields are stripped (`strip()` mode) to prevent mass-assignment attacks.
2. **SQL Injection Prevention:** All database operations utilize Prisma ORM with parameterized queries. Raw unescaped SQL strings are strictly prohibited.
3. **Cross-Site Scripting (XSS) Prevention:**
   - Complaint titles and descriptions are sanitized, escaping HTML entities before persistence and presentation.
   - Frontend renders data using React JSX, which escapes text by default.
4. **Geographic Coordinate Validation:**
   - Longitude: strictly $-180.0 \le \lambda \le +180.0$.
   - Latitude: strictly $-90.0 \le \phi \le +90.0$.
   - Out-of-bounds coordinates are rejected immediately with `422 Unprocessable Entity`.

---

## 5. Photographic Evidence & File Upload Security

Allowing users to upload files is one of the highest-risk application features. UrbanPulse enforces strict multi-stage validation:

```
[Upload Stream]
       │
       ▼
1. Size Check (Multer memory / stream limit: 5 MB max per file; max 3 files)
       │
       ▼
2. MIME Type Whitelist Validation (Only 'image/jpeg', 'image/png', 'image/webp')
       │
       ▼
3. Magic Number Byte Sniffing (Validates actual initial bytes, e.g. FF D8 FF for JPEG)
       │
       ▼
4. EXIF & Geolocation Stripping (Removes camera serials, device info, embedded GPS)
       │
       ▼
5. UUID Name Generation (Replaces user filename with cryptographically random UUID)
       │
       ▼
6. Storage Outside Web Root (Stored in isolated volume `/uploads` with no script execution)
       │
       ▼
7. Secure Delivery via Authenticated Controller with:
   - `Content-Type: image/jpeg`
   - `X-Content-Type-Options: nosniff`
   - `Content-Disposition: inline; filename="uuid.jpg"`
```

*Prohibited File Types:* Executables, `.svg` (prevents stored XSS via XML/scripts), `.html`, `.pdf`, `.zip`, `.sh`.

---

## 6. Network Security & HTTP Hardening

1. **HTTP Security Headers (Helmet.js):**
   - `Strict-Transport-Security` (HSTS): Enforces HTTPS connections.
   - `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing exploits.
   - `X-Frame-Options: DENY`: Prevents clickjacking attacks.
   - `Content-Security-Policy` (CSP): Restricts resource loading to trusted origins.
2. **Cross-Origin Resource Sharing (CORS):**
   - Configured with strict origin whitelisting (`cors({ origin: process.env.CLIENT_URL, credentials: true })`).
   - Wildcard origins (`*`) are disallowed when credentials/cookies are active.
3. **Rate Limiting (Brute-Force & Abuse Defense):**
   - `POST /api/v1/auth/login`: 5 attempts per 15-minute window per IP.
   - `POST /api/v1/auth/register`: 3 attempts per hour per IP.
   - `POST /api/v1/complaints`: 20 submissions per hour per user/IP.

---

## 7. Secrets Management & Environment Configuration

1. **No Source Control Secrets:** All sensitive credentials (`DATABASE_URL`, `JWT_SECRET`, internal tokens) must reside in `.env` files that are strictly excluded via `.gitignore`.
2. **Template Documentation:** Only non-sensitive variable names and safe defaults are stored in `.env.example`.
3. **Startup Validation:** The backend and AI services validate the presence and length of required environment variables at boot time; missing critical secrets cause an immediate graceful exit.

---

## 8. Structured Logging, Auditing & Privacy

1. **Sanitized Logs:** Application loggers (e.g. Winston/Pino) must redact sensitive headers (`Cookie`, `Authorization`) and request body fields (`password`, `confirmPassword`).
2. **Immutable Audit Trails:**
   - All administrative actions (status transitions, duplicate confirmations, priority overrides) are written to the `AuditLog` table within the same database transaction as the business entity update.
   - Audit logs capture: `timestamp`, `user_id`, `action`, `target_entity_type`, `target_entity_id`, `ip_address`, and JSON changes (`previous_state` -> `new_state`).
3. **Citizen Privacy & Data Minimization:**
   - Registration requires only name and email; no phone numbers, social security IDs, or home addresses are collected.
   - Citizen complaint descriptions should not contain private health or financial data. Guidance is provided on the submission form.
   - Retention policy recommendation: Resolved complaints and associated evidence images should be archived or purged after an agreed municipal retention window (e.g., 24 months).
   - *Legal Disclaimer:* UrbanPulse provides privacy-conscious technical architecture; specific legal compliance (e.g., GDPR, CCPA, local municipal records acts) must undergo formal legal evaluation prior to public production deployment.
