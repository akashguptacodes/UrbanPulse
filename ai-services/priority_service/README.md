# UrbanPulse — Priority Assessment Service

FastAPI-powered microservice responsible for civic complaint severity extraction, multi-factor priority scoring, and deterministic emergency safety overrides.

> **Sprint 1 Status:** Service scaffolded with health check endpoints, configuration validation, and unit smoke tests. Algorithmic components (keyword extraction, scoring engine, safety rules) will be implemented in **Sprint 6**.

---

## 1. Prerequisites

- Python 3.11+ (Python 3.13 supported)
- pip and virtualenv

---

## 2. Local Setup & Virtual Environment

### Windows (PowerShell)
```powershell
# Navigate to service directory
cd ai-services/priority_service

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### Linux / macOS / WSL
```bash
# Navigate to service directory
cd ai-services/priority_service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 3. Running the Service

Start the service independently on port `8002`:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

Service is accessible at:
- **Health Check:** [http://127.0.0.1:8002/health](http://127.0.0.1:8002/health)
- **Interactive OpenAPI Docs:** [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs)

---

## 4. Running Tests

Run smoke tests via `pytest`:

```bash
pytest tests/ -v
```
