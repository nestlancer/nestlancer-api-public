<div align="center">

# Full-stack onboarding (backend focus)

### Welcome to Nestlancer. This guide gets you from zero to a working API in one session; pair it with the [frontend onboarding](../../../nestlancer-frontend/docs/guides/onboarding.md) for the UI.

</div>

---

## 📖 Table of Contents

- [What you are working on](#what-you-are-working-on)
- [Day 1 setup](#day-1-setup)
- [Mental model](#mental-model)
- [Common tasks](#common-tasks)
- [Regenerate docs from repo](#regenerate-docs-from-repo)
- [Frontend sibling repo](#frontend-sibling-repo)

---

## What you are working on

**Nestlancer** is a single-studio platform: one operator (`ADMIN`) serves many clients (`USER`) through project requests, quotes, delivery, and Razorpay payments (INR / paise).

| Repo                     | Role                                              |
| :----------------------- | :------------------------------------------------ |
| `nestlancer-backend-api` | NestJS monorepo — gateway, 16 services, 8 workers |
| `nestlancer-frontend`    | Next.js Turborepo — web, admin, landing           |

---

## Day 1 setup

### 1. Prerequisites

Node 20+, pnpm 9+, Docker — [getting-started.md](./getting-started.md).

### 2. Clone and install

```bash
git clone <backend-repo-url> nestlancer-backend-api
cd nestlancer-backend-api
pnpm install
```

### 3. Environment

```bash
cp .env.development .env
# Or use Infisical: see infisical.md
```

### 4. Start stack

```bash
make dev-services   # Postgres, Redis, RabbitMQ, Mailpit
make db-migrate
make dev            # gateway + all services (heavy)
make db-seed        # core, blogs, portfolio via bash seed/seed.sh (needs the API up)
```

Minimal alternative — gateway + one service:

```bash
make dev-services
pnpm --filter @nestlancer/gateway dev
pnpm --filter @nestlancer/auth-service dev
```

### 5. Verify

| Check   | Command                                    |
| :------ | :----------------------------------------- |
| Health  | `curl http://localhost:3000/api/v1/health` |
| Swagger | open `http://localhost:3000/api/docs`      |
| Mail    | `http://localhost:8025` (Mailpit)          |

### 6. Read next (order)

1. [docs/README.md](../README.md) — documentation index
2. [architecture/overview.md](../architecture/overview.md) — ports and flow
3. [modification-playbook.md](./modification-playbook.md) — how to change code
4. [api/standards.md](../api/standards.md) — response envelope and auth
5. Component doc for your task under [components/services/](../components/services/)

---

## Mental model

```
Browser → Gateway :3000 → Microservice :300x → PostgreSQL
                              ↓
                         Outbox table
                              ↓
                         outbox-poller → RabbitMQ → Worker
```

Realtime: `ws-gateway :3001` + Redis pub/sub (not through REST gateway).

---

## Common tasks

| Task         | Doc                                                             |
| :----------- | :-------------------------------------------------------------- |
| Add endpoint | [modification-playbook.md](./modification-playbook.md)          |
| New service  | [adding-new-service.md](./adding-new-service.md)                |
| New worker   | [adding-new-worker.md](./adding-new-worker.md)                  |
| DB migration | `prisma/README.md`, [database/README.md](../database/README.md) |
| Deploy       | [production-vps-deploy.md](./production-vps-deploy.md)          |
| Debug tests  | [test-commands.md](./test-commands.md)                          |

---

## Regenerate docs from repo

```bash
node scripts/generate-component-docs.mjs
node scripts/generate-changelog.mjs
```

---

## Frontend sibling repo

```bash
cd ../nestlancer-frontend
pnpm install
pnpm docker:start   # web :9000, admin :9010
```

See [frontend onboarding](../../../nestlancer-frontend/docs/guides/onboarding.md).

---

<div align="center">

**Full-stack onboarding (backend focus)** — Nestlancer guide

</div>
