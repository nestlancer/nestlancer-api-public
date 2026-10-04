<div align="center">

# Troubleshooting guide

### Common issues when developing or operating the backend monorepo.

</div>

---

## 📖 Table of Contents

- [Gateway returns 502 Bad Gateway](#gateway-returns-502-bad-gateway)
- [401 Unauthorized on all routes](#401-unauthorized-on-all-routes)
- [403 CSRF](#403-csrf)
- [Prisma migration fails](#prisma-migration-fails)
- [RabbitMQ / workers not processing](#rabbitmq-workers-not-processing)
- [OpenAPI / contract check fails](#openapi-contract-check-fails)
- [Tests hang (E2E)](#tests-hang-e2e)
- [Related](#related)

---

## Gateway returns 502 Bad Gateway

**Cause:** Upstream microservice not running or wrong URL in env.

**Fix:**

1. Check service health: `curl http://localhost:<PORT>/health` for the target service.
2. Verify `*_SERVICE_URL` in `.env` matches running ports ([modification-playbook](./modification-playbook.md#service-port-quick-reference)).
3. `docker compose ps` — infra up?

---

## 401 Unauthorized on all routes

**Causes:** Expired access token, wrong JWT secret, missing `Authorization` header or cookies.

**Fix:**

1. Login again via `POST /api/v1/auth/login`.
2. Ensure gateway and auth service share `JWT_ACCESS_SECRET` / key pair.
3. For browser: cookies must match domain (`SameSite`, secure) — see frontend [nginx](../../../nestlancer-frontend/docs/guides/nginx.md).

---

## 403 CSRF

**Cause:** Mutating request from web app without CSRF double-submit cookie.

**Fix:** Call `GET /api/v1/auth/csrf-token` if enabled, or use Bearer-only clients. Check gateway CSRF guard config.

---

## Prisma migration fails

```bash
pnpm db:generate
make db-migrate
```

If drift: `make db-reset` (destroys local data). Production: never reset — fix forward migration.

---

## RabbitMQ / workers not processing

1. RabbitMQ UI: `http://localhost:15672`
2. Is `outbox-poller` running?
3. Queue depth growing → check worker logs, [DLQ runbook](../operations/runbooks/dlq-processing.md).

---

## OpenAPI / contract check fails

```bash
pnpm --filter @nestlancer/gateway dev
pnpm contract:refresh
pnpm contract:check
```

Fix Swagger decorators on changed controllers.

---

## Tests hang (E2E)

See [test-commands.md](./test-commands.md) — Jest `forceExit`, open handles, Docker test stack.

---

## Related

- [incident-response.md](../operations/runbooks/incident-response.md)
- [queue-recovery.md](../operations/runbooks/queue-recovery.md)

---

<div align="center">

**Troubleshooting guide** — Nestlancer guide

</div>
