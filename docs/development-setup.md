# UrbanPulse — Developer Setup & Onboarding Guide
**Sprint 1: Monorepo Setup & Development Environment**
*Document Version: 1.0.0*

---

## 1. System Prerequisites

Before starting, ensure your host environment meets the runtime requirements:

| Runtime / Tool | Minimum Version | Tested / Recommended Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | `v22.15.1` (or Node 20 LTS) | Frontend & Backend execution |
| **npm** | `>= 10.0.0` | `11.3.0` | Node package management |
| **Python** | `>= 3.11.0` | `3.13.3` (or 3.11/3.12) | AI microservices |
| **pip** | `>= 24.0.0` | `25.0.1` | Python package installation |
| **Git** | `>= 2.30.0` | Latest | Version control |

---

## 2. Monorepo Layout & Port Allocation

UrbanPulse services run on distinct, non-conflicting local ports:

| Service | Directory | Local URL | Port | Health Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `frontend/` | [http://localhost:5173](http://localhost:5173) | `5173` | UI Dev Console |
| **Main Backend** | `backend/` | [http://localhost:4000](http://localhost:4000) | `4000` | [http://localhost:4000/api/health](http://localhost:4000/api/health) |
| **Duplicate Service** | `ai-services/duplicate_service/` | [http://127.0.0.1:8001](http://127.0.0.1:8001) | `8001` | [http://127.0.0.1:8001/health](http://127.0.0.1:8001/health) |
| **Priority Service** | `ai-services/priority_service/` | [http://127.0.0.1:8002](http://127.0.0.1:8002) | `8002` | [http://127.0.0.1:8002/health](http://127.0.0.1:8002/health) |

---

## 3. Step-by-Step Installation

### Step 1: Clone & Configure Environment
```bash
# Copy the environment template to .env
cp .env.example .env
```
*(On Windows PowerShell, use `Copy-Item .env.example .env`)*

### Step 2: Install Node.js Dependencies
Install dependencies for both frontend and backend from the monorepo root:

```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Step 3: Set Up Python AI Services

#### Windows (PowerShell)
```powershell
# Setup Duplicate Service
cd ai-services/duplicate_service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate
cd ../..

# Setup Priority Service
cd ai-services/priority_service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate
cd ../..
```

#### Linux / macOS / WSL
```bash
# Setup Duplicate Service
cd ai-services/duplicate_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..

# Setup Priority Service
cd ai-services/priority_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..
```

### Step 4: Database Setup & Prisma Migrations (PostgreSQL / Neon)
1. Configure `DATABASE_URL` in your `.env` file:
   - **Local PostgreSQL:** `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/urbanpulse?schema=public"`
   - **Neon Cloud PostgreSQL:** `DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/urbanpulse?sslmode=require"`

2. Generate the Prisma Client types:
   ```bash
   cd backend
   npm run db:generate
   ```

3. Apply database migrations:
   ```bash
   # In development:
   npm run db:migrate:deploy
   # or with Prisma CLI:
   npx prisma migrate dev
   ```

---

## 4. Starting Services in Development

Open separate terminal windows for each service you wish to run:

### Terminal 1: Main Backend
```bash
cd backend
npm run dev
```
*Expected log:* `[UrbanPulse Backend] Service running on http://localhost:4000`

### Terminal 2: React Frontend
```bash
cd frontend
npm run dev
```
*Expected log:* `VITE v5.x.x ready in ... ms. Network: http://localhost:5173/`

### Terminal 3: Duplicate Detection AI Service
```bash
cd ai-services/duplicate_service
# Activate venv first!
.\venv\Scripts\Activate.ps1   # (Windows)
# or: source venv/bin/activate # (Unix/WSL)
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Terminal 4: Priority Assessment AI Service
```bash
cd ai-services/priority_service
# Activate venv first!
.\venv\Scripts\Activate.ps1   # (Windows)
# or: source venv/bin/activate # (Unix/WSL)
uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

---

## 5. Automated Verification & Testing

Verify that all services build, pass type checks, and pass unit smoke tests:

### Backend Checks
```bash
cd backend
npm run build   # Type-checks via tsc
npm run test    # Runs Vitest health and 404 tests
```

### Frontend Checks
```bash
cd frontend
npm run build   # Type-checks and builds production Vite bundle
npm run test    # Runs Vitest UI rendering tests
```

### AI Services Checks
```bash
# Duplicate service
cd ai-services/duplicate_service
pytest tests/ -v

# Priority service
cd ai-services/priority_service
pytest tests/ -v
```

---

## 6. Troubleshooting Common Issues

### Issue 1: Port Conflict (e.g. `EADDRINUSE: 4000`)
- **Cause:** Another process is listening on port 4000.
- **Fix:** Terminate the competing process, or update `BACKEND_PORT=4001` in `.env` and `VITE_BACKEND_URL=http://localhost:4001/api` in `frontend/`.

### Issue 2: PowerShell Execution Policy on Virtual Environment Activation
- **Cause:** PowerShell restricts script execution by default.
- **Fix:** Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned` in your PowerShell session before running `.\venv\Scripts\Activate.ps1`.

### Issue 3: CORS Errors when Frontend Calls Backend
- **Cause:** Backend CORS origin does not match the frontend origin.
- **Fix:** Check `CORS_ORIGIN` in `.env`. By default it must be `http://localhost:5173`.
