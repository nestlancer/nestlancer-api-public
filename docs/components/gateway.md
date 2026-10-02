<div align="center">

# API Gateway

### The **only public HTTP entry** for REST traffic. Clients (web, admin, mobile) never call microservice ports directly in production.

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [Responsibilities](#responsibilities)
- [Request pipeline](#request-pipeline)
- [Gateway route modules](#gateway-route-modules)
- [Authentication behavior](#authentication-behavior)
- [OpenAPI workflow](#openapi-workflow)
- [💻 Local development](#local-development)
- [Failure modes](#failure-modes)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|               |                                       |
| :------------ | :------------------------------------ |
| **Package**   | `@nestlancer/gateway`                 |
| **Source**    | `gateway/`                            |
| **Port**      | 3000                                  |
| **Base path** | `/api/v1`                             |
| **OpenAPI**   | `GET /api/docs`, `GET /docs-all-json` |

---

## Responsibilities

| Area         | Detail                                                                               |
| :----------- | :----------------------------------------------------------------------------------- |
| **Routing**  | Module controllers map URL prefixes to `HttpProxyService.forward('<service>', req)`  |
| **Security** | JWT validation, RBAC (`USER` / `ADMIN`), CSRF for cookie clients, webhook signatures |
| **Traffic**  | Rate limits: ~30/min anonymous, ~100/min user, ~300/min admin                        |
| **Contract** | Merged Swagger from all services; `openapi-merged.json` for CI                       |
| **BFF**      | Some routes aggregate parallel upstream calls (e.g. client dashboard summary)        |

---

## Request pipeline

```
HTTP Request
  → CORS
  → Correlation ID (X-Correlation-ID)
  → JwtAuthGuard (@Public() skips)
  → RateLimiterMiddleware
  → ValidationPipe (DTOs)
  → CsrfGuard (state-changing cookie requests)
  → Controller → HttpProxyService → upstream microservice
  → ResponseTransformInterceptor (envelope)
  → Metrics + logging
```

---

## Gateway route modules

Controllers live under `gateway/src/modules/`. Each domain module mirrors a microservice prefix:

| Module          | Proxies to                           | Example prefix          |
| :-------------- | :----------------------------------- | :---------------------- |
| `auth`          | auth                                 | `/api/v1/auth`          |
| `users`         | users                                | `/api/v1/users`         |
| `requests`      | requests                             | `/api/v1/requests`      |
| `quotes`        | quotes                               | `/api/v1/quotes`        |
| `projects`      | projects                             | `/api/v1/projects`      |
| `progress`      | progress                             | `/api/v1/progress`      |
| `payments`      | payments                             | `/api/v1/payments`      |
| `messaging`     | messaging                            | `/api/v1/messaging`     |
| `notifications` | notifications                        | `/api/v1/notifications` |
| `media`         | media                                | `/api/v1/media`         |
| `portfolio`     | portfolio                            | `/api/v1/portfolio`     |
| `blog`          | blog                                 | `/api/v1/blog`          |
| `contact`       | contact                              | `/api/v1/contact`       |
| `admin`         | admin (+ users proxy for user admin) | `/api/v1/admin`         |
| `webhooks`      | webhooks                             | `/api/v1/webhooks`      |
| `health`        | health                               | `/api/v1/health`        |

The **admin** module also forwards many `/api/v1/admin/users/*` routes to the **users** service for historical API shape compatibility.

---

## Authentication behavior

- **Bearer** header or **HttpOnly cookies** (`accessToken`, `refreshToken`)
- Refresh: `POST /api/v1/auth/refresh` — rotates refresh token
- Public routes decorated with `@Public()` from `@nestlancer/common`
- Admin routes require `ADMIN` role via `@Roles()` / `RolesGuard`

---

## OpenAPI workflow

```bash
pnpm contract:refresh   # export live merged JSON
pnpm contract:check     # Spectral lint (pre-push)
```

Committed mirror: `docs/api/openapi-merged.json`. Frontend pulls the same file into `swagger-docs/openapi-gateway.json`.

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/gateway dev
curl http://localhost:3000/api/v1/health
open http://localhost:3000/api/docs
```

Upstream service URLs come from env (`AUTH_SERVICE_URL`, etc.) — see [environment variables](../guides/environment-variables.md).

---

## Failure modes

| Symptom           | Check                                                        |
| :---------------- | :----------------------------------------------------------- |
| 502 from gateway  | Target service down or wrong `*_SERVICE_URL`                 |
| 401 on all routes | JWT secret mismatch between gateway and auth                 |
| 403 CSRF          | Missing CSRF cookie/header on mutating requests from browser |
| CORS errors       | `CORS_ORIGINS` must include frontend origins                 |

---

## 📚 Related documentation

- [WebSocket gateway](./ws-gateway.md)
- [API standards](../api/standards.md)
- [Architecture overview](../architecture/overview.md)
- [Nginx / TLS](../guides/nginx.md)
- [CHANGELOG](../changelog/CHANGELOG.md)

---

<div align="center">

**API Gateway** — Nestlancer backend component documentation

</div>
