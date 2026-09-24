import time
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import engine, Base, check_db_connection
from app.core.logging_middleware import RequestCorrelationMiddleware
from app.api.endpoints import upload, pipeline, results, predict, enterprise, auth, copilot, newsletter

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CRISP AI 3.0 Enterprise Causal Decision Intelligence Engine"
)

# Request ID correlation & structured JSON logging middleware
app.add_middleware(RequestCorrelationMiddleware)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(results.router, prefix="/api/pipeline/results", tags=["results"])
app.include_router(results.router, prefix="/api/results", tags=["results"])
app.include_router(predict.router, prefix="/api/inference/predict", tags=["predict"])
app.include_router(enterprise.router, prefix="/api", tags=["enterprise"])
app.include_router(copilot.router, prefix="/api/causal-copilot", tags=["copilot"])
app.include_router(newsletter.router, prefix="/api/newsletter", tags=["newsletter"])
app.include_router(newsletter.router, prefix="/api", tags=["newsletter"])


@app.get("/")
def read_root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "message": "Welcome to CRISP Causal Feature Selection API"
    }


@app.get("/health", tags=["observability"])
def health_check():
    """Liveness probe to confirm backend process is running."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ready", tags=["observability"])
def readiness_check():
    """Readiness probe checking database connectivity and storage readiness."""
    db_ok = check_db_connection()
    if not db_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failure. Service is not ready to receive traffic."
        )

    return {
        "status": "ready",
        "database": "connected",
        "storage": settings.STORAGE_BACKEND,
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
