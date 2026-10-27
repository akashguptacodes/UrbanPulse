# UrbanPulse — Infrastructure & Containerization Strategy

This directory contains containerization definitions and environment strategies for UrbanPulse.

---

## 1. Phased Containerization Strategy

In accordance with the Sprint Roadmap:
- **Sprint 1 (Current):** Local-first development environment runs directly on host runtimes (Node.js 22 LTS, Python 3.13) without requiring Docker.
- **Sprint 2:** A lightweight `docker-compose.yml` will be introduced to host the persistent PostgreSQL 16 database container with a dedicated volume for database state.
- **Sprint 9:** Production-grade multi-stage `Dockerfile` definitions and `docker-compose.prod.yml` will orchestrate the complete platform (Frontend, Backend, PostgreSQL, Duplicate Service, Priority Service) with internal bridge networks, resource limits, and health checks.

---

## 2. Planned Container Topology (Sprint 9 Preview)

```
[Host Port 80/443]  ──►  frontend (Nginx / Vite static dist)
[Host Port 4000]    ──►  backend (Node.js 20 LTS Alpine)
                           ├── Connected to postgres:5432 (Internal Network)
                           ├── Connected to duplicate-service:8001 (Internal Network)
                           └── Connected to priority-service:8002 (Internal Network)
```
