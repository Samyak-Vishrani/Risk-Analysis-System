# ──────────────────────────────────────────────
# Worker Service – Node.js 22 Alpine
# ──────────────────────────────────────────────
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies first (layer cache)
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY worker/ ./

# No port exposed – worker is a background job processor

CMD ["node", "src/worker.js"]
