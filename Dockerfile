#############################
# CRISP AI - Backend Engine
# Render Optimized Container
#############################

FROM python:3.10-slim

LABEL maintainer="Frank Soboczenski <frank.soboczenski@gmail.com>"

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=10000

# ప్రాథమిక సిస్టమ్ టూల్స్
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ప్రాజెక్ట్ ఫైల్స్ కాపీ చేయడం
COPY . /app

# CPU-ఓన్లీ PyTorch ఇన్‌స్టాల్ చేయడం (Render సర్వర్లకు ఇది చాలా వేగంగా పనిచేస్తుంది)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# మీ ప్రాజెక్ట్ requirements ఇన్‌స్టాల్ చేయడం
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

EXPOSE 10000

# మీ బ్యాకెండ్ సర్వర్‌ను రన్ చేసే కమాండ్ (FastAPI లేదా Flask)
CMD ["sh", "-c", "if [ -f main.py ]; then uvicorn main:app --host 0.0.0.0 --port ${PORT}; elif [ -f app.py ]; then python app.py; else python3; fi"]
