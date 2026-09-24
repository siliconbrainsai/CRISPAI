# CRISP AI 3.0 Enterprise Deployment & Operations Guide

## 1. Architecture Overview
CRISP AI 3.0 Enterprise is structured for zero-downtime, scalable, multi-tenant deployment:
* **Backend**: FastAPI with Python 3.11, SQLAlchemy 2.0, Alembic migrations, PyJWT security, and asynchronous Job Queue.
* **Storage**: Multi-tenant partitioned local storage with path traversal defense or AWS S3 / MinIO cloud storage.
* **Database**: Dual compatibility—development default on SQLite (`crisp_ai.db`) and enterprise production on PostgreSQL with connection pooling.
* **Queue**: Distributed job execution supporting multi-worker concurrency and Celery/Redis.
* **Observability**: Structured JSON logging with `X-Request-ID` correlation, `/health` liveness probe, and `/ready` readiness probe.

---

## 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp backend/.env.example backend/.env
```

Key environment settings:
* `ENVIRONMENT`: Set to `production` or `development`.
* `DATABASE_URL`:
  * Local Dev: `sqlite:///./crisp_ai.db`
  * Production: `postgresql://user:password@host:5432/crisp_enterprise`
* `JWT_SECRET_KEY`: High-entropy 256-bit secret string for token signing.
* `STORAGE_BACKEND`: `local` or `s3`.
* `WORKER_CONCURRENCY`: Number of concurrent worker threads (default `4`).

---

## 3. Database Migration & Alembic
Run schema migrations:
```bash
cd backend
python -m alembic upgrade head
```

To create a new migration after model changes:
```bash
python -m alembic revision --autogenerate -m "describe_migration"
python -m alembic upgrade head
```

---

## 4. Docker Deployment
Deploy the full-stack system using Docker Compose:
```bash
docker-compose up -d --build
```

Verify services:
```bash
docker-compose ps
```

Health and readiness probes:
* Liveness: `curl -f http://localhost:8000/health`
* Readiness: `curl -f http://localhost:8000/ready`

---

## 5. Security & RBAC Operations
CRISP AI 3.0 enforces four discrete enterprise roles:
1. **Admin**: Full access including user management, audit logs, and dataset deletion.
2. **Data Scientist**: Dataset upload, causal discovery, analysis execution, and report generation.
3. **Analyst**: Dataset exploration, report generation, and viewing causal graphs.
4. **Viewer**: Read-only access to datasets, reports, and completed analyses.

Passwords are salted and hashed using native `bcrypt`. Passwords are never stored in plaintext. All entity records are automatically partitioned by `workspace_id`.
