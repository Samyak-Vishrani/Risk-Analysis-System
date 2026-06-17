# Docker Setup – Risk Analysis System

## Quick Start

```bash
# From the project root directory:
docker-compose up --build
```

This starts **all 7 containers**: PostgreSQL, Redis, API Gateway, Transaction Service, Worker, ML Service, and Frontend.

## Services & Ports

| Service               | Container Name            | Port  | URL                       |
|-----------------------|---------------------------|-------|---------------------------|
| Frontend (Nginx)      | `risk-frontend`           | 80    | http://localhost           |
| API Gateway           | `risk-api-gateway`        | 5000  | http://localhost:5000      |
| Transaction Service   | `risk-transaction-service`| 5001  | http://localhost:5001      |
| ML Service (FastAPI)  | `risk-ml-service`         | 8000  | http://localhost:8000      |
| PostgreSQL            | `risk-postgres`           | 5432  | –                          |
| Redis                 | `risk-redis`              | 6379  | –                          |
| Worker                | `risk-worker`             | –     | – (background processor)  |

## Commands

```bash
# Start in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f ml-service

# Stop all services
docker-compose down

# Stop and remove volumes (wipes database)
docker-compose down -v

# Rebuild a single service
docker-compose build transaction-service
docker-compose up -d transaction-service
```

## Environment Variables

All environment variables are configured in `docker-compose.yml`. To override the database password:

```bash
DB_PASSWORD=my_secure_password docker-compose up --build
```

Or create a `.env` file in the project root:

```env
DB_PASSWORD=my_secure_password
```

## Important Note: Redis Connections

The `worker/src/worker.js` and `transaction-service/src/queue/transactionQueue.js` files currently have **hardcoded** Redis connections to `127.0.0.1:6379`. For Docker networking to work, these should use environment variables:

```js
// Replace hardcoded connection:
const connection = new IORedis({ host: "127.0.0.1", port: 6379 });

// With environment-variable-driven connection:
const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null
});
```

The `docker-compose.yml` already passes `REDIS_HOST=redis` and `REDIS_PORT=6379` to these services. You just need to update the source files to read from `process.env`.

## Architecture

```
                    ┌─────────────┐
                    │   Frontend  │ :80
                    │   (Nginx)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
     ┌────────────────┐       ┌──────────────────┐
     │  API Gateway   │       │   Transaction    │
     │    :5000       │       │   Service :5001  │
     └────────────────┘       └────────┬─────────┘
                                       │
                              ┌────────┼────────┐
                              ▼                  ▼
                        ┌──────────┐     ┌────────────┐
                        │  Redis   │     │ PostgreSQL │
                        │  :6379   │     │   :5432    │
                        └────┬─────┘     └────────────┘
                             │                  ▲
                             ▼                  │
                       ┌──────────┐      ┌──────┴──────┐
                       │  Worker  │─────▶│ ML Service  │
                       │  (BullMQ)│      │   :8000     │
                       └──────────┘      └─────────────┘
```
