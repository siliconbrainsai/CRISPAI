#############################
# CRISP AI - Backend Engine
# Render Optimized Container
#############################

FROM python:3.10-slim

LABEL maintainer="Frank Soboczenski <frank.soboczenski@gmail.com>"

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=10000

# Install build tools, compilers and python headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    python3-dev \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pre-install core build tools and numpy first
RUN pip install --no-cache-dir --upgrade pip setuptools wheel Cython
RUN pip install --no-cache-dir numpy

# Copy application files
COPY . /app

# Install CPU PyTorch
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install requirements with no-build-isolation to use pre-installed numpy/Cython
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir --no-build-isolation -r requirements.txt; fi

EXPOSE 10000

# Start backend server
CMD ["sh", "-c", "if [ -f main.py ]; then uvicorn main:app --host 0.0.0.0 --port ${PORT}; elif [ -f app.py ]; then python app.py; else python3; fi"]
