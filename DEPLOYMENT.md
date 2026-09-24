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

---

## 6. Vercel Deployment (Frontend & SPA Routing)

CRISP AI is pre-configured with `vercel.json` for zero-configuration deployment on [Vercel](https://vercel.com):

### Quick 2-Minute Deployment via Vercel Dashboard:
1. Navigate to **[vercel.com/new](https://vercel.com/new)** and log in with your GitHub account.
2. Select **Import Git Repository** and choose `siliconbrainsai/CRISPAI`.
3. In the project configuration:
   - **Root Directory**: Click **Edit** and choose **`frontend`** (Crucial: prevents Vercel from mistaking the repo for a Python FastAPI app)
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://crispai.onrender.com/api` (or your backend Render URL).
5. Click **Deploy**.

Vercel will automatically build the React application, configure SPA rewrites (preventing 404s on `/causal-engine` and `/analysis`), and assign a global HTTPS production domain (e.g. `https://crisp-ai.vercel.app`). Any subsequent `git push` to `main` will automatically trigger a new deployment.

---

## 7. Render Deployment (Backend API Service)

CRISP AI includes both a native `render.yaml` blueprint and a production `Dockerfile` optimized for Render Web Services.

### Option A: Deploy via Blueprint (Fastest & Zero Configuration)
1. Go to **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** -> **Blueprint**.
3. Connect your repository: `siliconbrainsai/CRISPAI`.
4. Render will read `render.yaml` and configure the service automatically:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
5. Click **Apply**.

### Option B: Deploy via Docker (Automatic Detection)
If deploying via Render's Docker runtime:
1. In Render, select **New +** -> **Web Service** -> Connect `siliconbrainsai/CRISPAI`.
2. Select **Docker** as the environment.
3. Keep default settings (Render will build from the root `Dockerfile`).
4. The container is configured with Python 3.11, pre-cached CPU PyTorch, and starts using:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
   ```
5. Set Health Check Path to `/health`.

### Option C: Manual Python Web Service
1. In Render, select **New +** -> **Web Service** -> Connect `siliconbrainsai/CRISPAI`.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Add Environment Variables:
   - `ENVIRONMENT`: `production`
   - `DATABASE_URL`: `sqlite:///./crisp_ai.db` (or your PostgreSQL URL)
   - `JWT_SECRET_KEY`: `<generate-a-secure-random-key>`
