#############################
# CRISP AI - Backend Engine
# Render Optimized Container
#############################

FROM python:3.10-slim

LABEL maintainer="Frank Soboczenski <frank.soboczenski@gmail.com>"

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=10000

# సిస్టమ్ డిపెండెన్సీలు మరియు C-కంపైలర్ టూల్స్
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

# బిల్డ్ టూల్స్ మరియు కంపైలర్ డిపెండెన్సీలను ముందుగానే ఇన్‌స్టాల్ చేయడం
RUN pip install --no-cache-dir --upgrade pip setuptools wheel Cython numpy

# ప్రాజెక్ట్ ఫైల్స్‌ను కంటైనర్‌లోకి కాపీ చేయడం
COPY . /app

# CPU-ఓన్లీ PyTorch ఇన్‌స్టాలేషన్
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# requirements.txt లోని లైబ్రరీలను ఇన్‌స్టాల్ చేయడం
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

EXPOSE 10000

# బ్యాకెండ్ సర్వర్‌ను ఆటోమేటిక్‌గా రన్ చేసే కమాండ్ (FastAPI లేదా Flask)
CMD ["sh", "-c", "if [ -f main.py ]; then uvicorn main:app --host 0.0.0.0 --port ${PORT}; elif [ -f app.py ]; then python app.py; else python3; fi"]
