# ──────────────────────────────────────────────
# API Gateway – Node.js 22 Alpine
# ──────────────────────────────────────────────
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies first (layer cache)
COPY api-gateway/package.json api-gateway/package-lock.json ./
RUN npm ci --omit=dev

# Copy application code
COPY api-gateway/ ./

# Expose the gateway port
EXPOSE 5000

# Health-check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/ || exit 1

CMD ["node", "index.js"]
