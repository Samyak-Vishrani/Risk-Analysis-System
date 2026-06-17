# ──────────────────────────────────────────────
# Frontend – Multi-stage build (Vite → Nginx)
# ──────────────────────────────────────────────

# Stage 1: Build the React app
FROM node:22-alpine AS builder

# Native build tools for npm packages with C/C++ bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY frontend/fraud-dashboard/package.json frontend/fraud-dashboard/package-lock.json ./
RUN npm ci || npm install

COPY frontend/fraud-dashboard/ ./

# Build-time env var – override via docker-compose or --build-arg
ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config for SPA routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
