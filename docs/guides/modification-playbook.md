<div align="center">

# Backend modification playbook

### Step-by-step guide for changing the Nestlancer API safely. Read the [component doc](../components/README.md) for the area you touch first.

</div>

---

## 📖 Table of Contents

- [Decision tree: what am I changing?](#decision-tree-what-am-i-changing)
- [Standard flow: add an endpoint to an existing service](#standard-flow-add-an-endpoint-to-an-existing-service)
- [Money and currency rules](#money-and-currency-rules)
- [Idempotency (payments & critical writes)](#idempotency-payments-critical-writes)
- [Environment & secrets](#environment-secrets)
- [Service port quick reference](#service-port-quick-reference)
- [Domain → documentation map](#domain-documentation-map)
- [Related](#related)

---

## Decision tree: what am I changing?

| You need to…                         | Start here                                       | Also update                                                                                                  |
| :----------------------------------- | :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| New REST endpoint on existing domain | `services/<name>/src/controllers/`               | Gateway module, OpenAPI, `docs/api/services/<name>.md`, frontend Orval                                       |
| New microservice                     | [adding-new-service.md](./adding-new-service.md) | Prisma schema, K8s, gateway registry, component doc                                                          |
| New async side effect                | Outbox event in service + processor in worker    | [event-catalog.md](../architecture/event-catalog.md), [queue-topology.md](../architecture/queue-topology.md) |
| DB schema change                     | `prisma/schema/*.prisma` → migration             | Seeds, affected services, [MIGRATION_GUIDE](../changelog/MIGRATION_GUIDE.md)                                 |
| Auth / roles                         | `libs/auth-lib`, gateway guards                  | Frontend middleware + `@nestlancer/auth`                                                                     |
| Payment / Razorpay                   | `services/payments`, `webhook-worker`            | Idempotency keys, paise amounts, frontend checkout                                                           |
| Public vs admin route                | Controller folder: `public/`, `user/`, `admin/`  | Swagger tags, gateway proxy path                                                                             |

---

## Standard flow: add an endpoint to an existing service

### 1. Service layer

```
services/<domain>/src/
├── controllers/...     # HTTP + Swagger decorators
├── services/...        # Business logic
├── dto/                # class-validator DTOs
└── repositories/       # Prisma access (if used)
```

1. Add DTO with validation decorators (`class-validator`).
2. Implement logic in `*.service.ts` — use `PrismaWriteService` for mutations, `PrismaReadService` for lists.
3. For mutations that notify users: write **outbox** row in the **same transaction** (`@nestlancer/outbox`).
4. Add controller method with `@ApiOperation`, `@ApiStandardResponse`, correct guards (`JwtAuthGuard`, `@Roles('ADMIN')`).

### 2. Gateway

`gateway/src/modules/<domain>/` — add route handler that calls `this.proxy.forward('<serviceKey>', req)` unless the route is already a catch-all.

Verify locally:

```bash
pnpm --filter @nestlancer/gateway dev
pnpm --filter @nestlancer/<domain>-service dev
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/...
```

### 3. Contract & docs

```bash
pnpm contract:refresh          # updates docs/api/openapi-merged.json
pnpm contract:check
node scripts/generate-component-docs.mjs
```

Update human spec: `docs/api/services/<domain>.md` (examples, rate limits).

### 4. Tests

| Layer       | Path                                        |
| :---------- | :------------------------------------------ |
| Unit        | `services/<domain>/tests/unit/*.spec.ts`    |
| Service E2E | `services/<domain>/tests/e2e/*.e2e-spec.ts` |
| System      | repo root `tests/system/` (cross-service)   |

Run: `pnpm --filter @nestlancer/<domain>-service test` — see [test-commands.md](./test-commands.md).

### 5. Frontend (sibling repo)

```bash
cd ../nestlancer-frontend
pnpm pull:openapi && pnpm codegen
# Wire UI in apps/web or apps/admin features/<domain>/
```

---

## Money and currency rules

- **INR only**; store amounts as **integers in paise** (₹1 = 100 paise).
- Swagger and DTOs must document `amountPaise` / similar — never float rupees in JSON.
- Razorpay order amounts are paise.

---

## Idempotency (payments & critical writes)

Use `@Idempotent()` / idempotency header on POST that must not double-charge. See [ADR 007](../adr/007-idempotency-strategy.md) and `libs/idempotency`.

---

## Environment & secrets

- Local: `.env.development` or Infisical — [infisical.md](./infisical.md), [environment-variables.md](./environment-variables.md).
- Never commit secrets; service URLs use `*_SERVICE_URL` for gateway proxy targets.

---

## Service port quick reference

| Service       | Port | Env                          |
| :------------ | :--- | :--------------------------- |
| auth          | 3001 | `AUTH_SERVICE_PORT`          |
| users         | 3002 | `USERS_SERVICE_PORT`         |
| payments      | 3003 | `PAYMENTS_SERVICE_PORT`      |
| webhooks      | 3004 | `WEBHOOKS_SERVICE_PORT`      |
| admin         | 3005 | `ADMIN_SERVICE_PORT`         |
| requests      | 3006 | `REQUESTS_SERVICE_PORT`      |
| quotes        | 3007 | `QUOTES_SERVICE_PORT`        |
| projects      | 3008 | `PROJECTS_SERVICE_PORT`      |
| progress      | 3009 | `PROGRESS_SERVICE_PORT`      |
| messaging     | 3010 | `MESSAGING_SERVICE_PORT`     |
| notifications | 3011 | `NOTIFICATIONS_SERVICE_PORT` |
| media         | 3012 | `MEDIA_SERVICE_PORT`         |
| portfolio     | 3013 | `PORTFOLIO_SERVICE_PORT`     |
| blog          | 3014 | `BLOG_SERVICE_PORT`          |
| contact       | 3015 | `CONTACT_SERVICE_PORT`       |
| health        | 3016 | `HEALTH_SERVICE_PORT`        |
| gateway       | 3000 | —                            |
| ws-gateway    | 3001 | —                            |

---

## Domain → documentation map

| Business area     | Service doc                                                                              | API spec                                             |
| :---------------- | :--------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| Login / register  | [auth](../components/services/auth.md)                                                   | [auth.md](../api/services/auth.md)                   |
| Profile / users   | [users](../components/services/users.md)                                                 | [users.md](../api/services/users.md)                 |
| Client inquiries  | [requests](../components/services/requests.md)                                           | [requests.md](../api/services/requests.md)           |
| Proposals         | [quotes](../components/services/quotes.md)                                               | [quotes.md](../api/services/quotes.md)               |
| Engagements       | [projects](../components/services/projects.md)                                           | [projects.md](../api/services/projects.md)           |
| Delivery          | [progress](../components/services/progress.md)                                           | [progress.md](../api/services/progress.md)           |
| Billing           | [payments](../components/services/payments.md)                                           | [payments.md](../api/services/payments.md)           |
| Chat              | [messaging](../components/services/messaging.md)                                         | [messaging.md](../api/services/messaging.md)         |
| Alerts            | [notifications](../components/services/notifications.md)                                 | [notifications.md](../api/services/notifications.md) |
| Files             | [media](../components/services/media.md)                                                 | [media.md](../api/services/media.md)                 |
| Marketing content | [blog](../components/services/blog.md), [portfolio](../components/services/portfolio.md) | same                                                 |
| Operator tools    | [admin](../components/services/admin.md)                                                 | [admin.md](../api/services/admin.md)                 |

---

## Related

- [Coding standards](./coding-standards.md)
- [Testing strategy](./testing-strategy.md)
- [CHANGELOG](../changelog/CHANGELOG.md)

---

<div align="center">

**Backend modification playbook** — Nestlancer guide

</div>
