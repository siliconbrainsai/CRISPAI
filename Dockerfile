#############################
# CRISP AI - Backend Engine
# Render Optimized Container
#############################

FROM python:3.10-slim

LABEL maintainer="Frank Soboczenski <frank.soboczenski@gmail.com>"

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=10000

# Install build tools, compilers, system libraries, and python headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    python3-dev \
    gcc \
    g++ \
    libgomp1 \
    sed \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade core packaging tools and pre-install build dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel Cython
RUN pip install --no-cache-dir numpy

# Copy repository source code
COPY . /app

# Install lightweight CPU-only PyTorch build to avoid CUDA bloat & resolution loops
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir --no-build-isolation -r requirements.txt; \
    fi

EXPOSE 10000

# Auto-detect ASGI application entrypoint across root, backend, and crispv3 directories
CMD ["sh", "-c", "if [ -f backend/main.py ] && python3 -c 'import backend.main; hasattr(backend.main, \"app\")' 2>/dev/null; then cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT}; elif [ -f crispv3/backend/main.py ] && python3 -c 'import crispv3.backend.main; hasattr(crispv3.backend.main, \"app\")' 2>/dev/null; then cd crispv3/backend && uvicorn main:app --host 0.0.0.0 --port ${PORT}; elif python3 -c 'import main; hasattr(main, \"app\")' 2>/dev/null; then uvicorn main:app --host 0.0.0.0 --port ${PORT}; elif [ -f app.py ] && python3 -c 'import app; hasattr(app, \"app\")' 2>/dev/null; then uvicorn app:app --host 0.0.0.0 --port ${PORT}; elif [ -f main.py ]; then python3 main.py; else python3 app.py; fi"]
