# ──────────────────────────────────────────────
# ML Service – Python 3.12 Slim (FastAPI)
# ──────────────────────────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System dependencies for scikit-learn / numpy / psycopg2
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache)
COPY ml-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code + trained model
COPY ml-service/ ./

# Set model path (relative to WORKDIR)
ENV MODEL_PATH=/app/fraud_model.pkl
ENV MODEL_VERSION=1.0.0
ENV PYTHONPATH=/app/app

# Expose FastAPI port
EXPOSE 8000

# Health-check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
