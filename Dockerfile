# ==============================================================================
# CRISP AI 3.0 - Production Dockerfile for Render, Cloud & Local Deployment
# ==============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONPATH=/app/backend:/app \
    PORT=8000

WORKDIR /app

# Install system runtime & compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Pre-install lightweight CPU-only PyTorch build to avoid CUDA bloat & slow builds
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install dependencies
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy full codebase
COPY . .

# Ensure upload and log directories exist
RUN mkdir -p backend/uploads backend/logs uploads logs && \
    chmod -R 755 backend/uploads backend/logs uploads logs

EXPOSE 8000 10000

# Production entrypoint:
# Supports Render dynamic $PORT, standard uvicorn, and both root/backend module paths
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
