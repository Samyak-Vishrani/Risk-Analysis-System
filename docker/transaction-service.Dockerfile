# ──────────────────────────────────────────────
# Transaction Service – Node.js 22 Alpine
# ──────────────────────────────────────────────
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies first (layer cache)
COPY transaction-service/package.json transaction-service/package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY transaction-service/ ./

# Expose the transaction service port
EXPOSE 5001

# Health-check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5001/ || exit 1

CMD ["node", "index.js"]
