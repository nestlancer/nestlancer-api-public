<div align="center">

# Getting Started

</div>

---

## 📖 Table of Contents

- [Prerequisites](#prerequisites)
- [🚀 Quick Start](#quick-start)
- [Service URLs](#service-urls)
- [Common Commands](#common-commands)

---

## Prerequisites

- **Node.js** 20+ (use `nvm use` with `.nvmrc`)
- **pnpm** 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker Desktop** (for PostgreSQL, Redis, RabbitMQ)
- **Git**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/nestlancer/nestlancer-backend-api.git
cd nestlancer-backend-api
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment

```bash
cp .env.development .env
# Edit .env with your local settings (defaults work for Docker)
```

### 4. Start Infrastructure

```bash
make dev
# This starts PostgreSQL, Redis, RabbitMQ, Mailpit via Docker Compose
# Then runs Prisma migrations and starts all services with Turborepo
```

### 5. Verify

```bash
curl http://localhost:3000/api/v1/health
# Expected: {"status":"success","data":{"status":"healthy",...}}
```

---

## Service URLs

| Service             | URL                                              |
| :------------------ | :----------------------------------------------- |
| API Gateway         | http://localhost:3000                            |
| Swagger UI          | http://localhost:3000/api/docs                   |
| WebSocket Gateway   | ws://localhost:3001                              |
| RabbitMQ Management | http://localhost:15672 (guest/guest)             |
| Mailpit (Email)     | http://localhost:8025                            |
| Prisma Studio       | Run `pnpm prisma studio` → http://localhost:5555 |

---

## Common Commands

| Command           | Description                         |
| :---------------- | :---------------------------------- |
| `make dev`        | Start full dev stack                |
| `make test`       | Run all tests                       |
| `make lint`       | Run linter                          |
| `make build`      | Build all packages                  |
| `make db-migrate` | Run database migrations             |
| `make db-seed`    | Seed core, blogs, and portfolio (`seed/seed.sh`) |
| `make db-reset`   | Drop the database, migrate, then seed |
| `make clean`      | Remove dist, coverage, node_modules |

---

<div align="center">

**Getting Started** — Nestlancer guide

</div>
