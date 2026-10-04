<div align="center">

# Local Development Guide

</div>

---

## 📖 Table of Contents

- [Docker Service Management](#docker-service-management)
- [Running Individual Services](#running-individual-services)
- [Debugging with VS Code](#debugging-with-vs-code)
- [Database](#database)
- [Logs](#logs)
- [WebSocket Testing](#websocket-testing)
- [Hot Reload](#hot-reload)

---

## Docker Service Management

### Start infrastructure only

```bash
scripts/dev/start-services.sh
# Starts: PostgreSQL, Redis (cache + pubsub), RabbitMQ, Mailpit
```

### Start with full observability stack

```bash
scripts/dev/start-services.sh --full
# Also starts: S3-compatible object storage (local dev), Jaeger (tracing)
```

### Stop services

```bash
docker compose down
```

---

## Running Individual Services

```bash
# Run a specific service
pnpm --filter @nestlancer/auth dev

# Run the API gateway
pnpm --filter @nestlancer/gateway dev

# Run multiple services
pnpm turbo dev --filter=@nestlancer/auth --filter=@nestlancer/gateway
```

---

## Debugging with VS Code

1. Start a service with debug port:

   ```bash
   NODE_OPTIONS='--inspect=0.0.0.0:9229' pnpm --filter @nestlancer/auth dev
   ```

2. Attach VS Code debugger using `.vscode/launch.json`:
   ```json
   {
     "type": "node",
     "request": "attach",
     "name": "Attach to Service",
     "port": 9229,
     "restart": true,
     "sourceMaps": true
   }
   ```

---

## Database

### Run migrations

```bash
pnpm prisma migrate dev
```

### Seed data

Services must already be running. `pnpm db:seed` loads core config, blogs, and portfolio through the APIs (Postgres and MinIO).

```bash
pnpm db:seed
# same as: bash seed/seed.sh --env=dev --phase=core,content

# One phase at a time (see seed/README.md):
bash seed/seed.sh --env=dev --phase=core --skip-export
bash seed/seed.sh --env=dev --phase=blogs --skip-export
bash seed/seed.sh --env=dev --phase=portfolio --skip-export

# Wipe buckets and rows, then load demo clients as well:
bash seed/seed.sh --env=dev
```

### View data

```bash
pnpm prisma studio
```

### Reset database

`pnpm db:reset` drops the database, replays migrations, then runs the API seed. The Docker stack has to be up or the seed step cannot log in.

```bash
pnpm db:reset
```

---

## Logs

### Watch all service logs

```bash
scripts/dev/watch-logs.sh
```

### Filter by service

```bash
scripts/dev/watch-logs.sh --service=auth
```

---

## WebSocket Testing

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c "ws://localhost:3001/ws/messages?token=YOUR_JWT_TOKEN"
```

---

## Hot Reload

All services use NestJS hot-reload (`nest start --watch`). Changes to `.ts` files trigger automatic restart.

---

<div align="center">

**Local Development Guide** — Nestlancer guide

</div>
