<div align="center">

# Blog Service

### Headless CMS: posts, taxonomy, comments, likes, bookmarks, RSS, scheduling, moderation.

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [🎯 What this service owns](#what-this-service-owns)
- [🏗 How it fits in the platform](#how-it-fits-in-the-platform)
- [🌐 HTTP surface (discovered from controllers)](#http-surface-discovered-from-controllers)
- [📎 Dependencies (`@nestlancer/*`)](#dependencies-nestlancer)
- [🔌 External integrations](#external-integrations)
- [📨 Domain events (outbox)](#domain-events-outbox)
- [⚙️ Configuration](#configuration)
- [💻 Local development](#local-development)
- [🧪 Testing](#testing)
- [🛠 Operations](#operations)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|                       |                                                          |
| :-------------------- | :------------------------------------------------------- |
| **Package**           | `@nestlancer/blog-service`                               |
| **Source**            | `services/blog/`                                         |
| **Default port**      | 3014 (env: `BLOG_SERVICE_PORT`)                          |
| **Gateway prefix**    | `/api/v1/blog`                                           |
| **Primary data**      | Post, Comment, BlogCategory, BlogTag, Bookmark, PostView |
| **Detailed API spec** | [blog endpoints](../../api/services/blog.md)             |

---

## 🎯 What this service owns

- Public read APIs with ISR-friendly shapes
- Client-side view tracking and engagement endpoints
- Admin editor, revisions, scheduled publish, comment moderation

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/blog) → Blog Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/blog`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)                          | Controller                                                 |
| :------- | :----------------------------------------------- | :--------------------------------------------------------- |
| `GET`    | `/admin/blog/analytics`                          | `src/controllers/admin/blog-analytics.admin.controller.ts` |
| `GET`    | `/admin/blog/analytics/top-posts`                | `src/controllers/admin/blog-analytics.admin.controller.ts` |
| `GET`    | `/admin/blog/analytics/engagement`               | `src/controllers/admin/blog-analytics.admin.controller.ts` |
| `GET`    | `/admin/blog/analytics/:id`                      | `src/controllers/admin/blog-analytics.admin.controller.ts` |
| `GET`    | `/admin/comments`                                | `src/controllers/admin/comments.admin.controller.ts`       |
| `GET`    | `/admin/comments/pending`                        | `src/controllers/admin/comments.admin.controller.ts`       |
| `GET`    | `/admin/comments/reported`                       | `src/controllers/admin/comments.admin.controller.ts`       |
| `POST`   | `/admin/comments/:id/approve`                    | `src/controllers/admin/comments.admin.controller.ts`       |
| `PATCH`  | `/admin/comments/:id/approve`                    | `src/controllers/admin/comments.admin.controller.ts`       |
| `POST`   | `/admin/comments/:id/reject`                     | `src/controllers/admin/comments.admin.controller.ts`       |
| `PATCH`  | `/admin/comments/:id/reject`                     | `src/controllers/admin/comments.admin.controller.ts`       |
| `POST`   | `/admin/comments/:id/spam`                       | `src/controllers/admin/comments.admin.controller.ts`       |
| `PATCH`  | `/admin/comments/:id/spam`                       | `src/controllers/admin/comments.admin.controller.ts`       |
| `POST`   | `/admin/comments/:id/pin`                        | `src/controllers/admin/comments.admin.controller.ts`       |
| `POST`   | `/admin/comments/:id/unpin`                      | `src/controllers/admin/comments.admin.controller.ts`       |
| `DELETE` | `/admin/comments/:id`                            | `src/controllers/admin/comments.admin.controller.ts`       |
| `POST`   | `/admin/comments/:id/reply`                      | `src/controllers/admin/comments.admin.controller.ts`       |
| `GET`    | `/admin/posts`                                   | `src/controllers/admin/posts.admin.controller.ts`          |
| `GET`    | `/admin/posts/:id`                               | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts`                                   | `src/controllers/admin/posts.admin.controller.ts`          |
| `PATCH`  | `/admin/posts/:id`                               | `src/controllers/admin/posts.admin.controller.ts`          |
| `DELETE` | `/admin/posts/:id`                               | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/publish`                       | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/unpublish`                     | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/schedule`                      | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/feature`                       | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/unfeature`                     | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/pin`                           | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/unpin`                         | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/duplicate`                     | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/archive`                       | `src/controllers/admin/posts.admin.controller.ts`          |
| `GET`    | `/admin/posts/:id/revisions`                     | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/:id/revisions/:revisionId/restore` | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/import`                            | `src/controllers/admin/posts.admin.controller.ts`          |
| `POST`   | `/admin/posts/export`                            | `src/controllers/admin/posts.admin.controller.ts`          |
| `PATCH`  | `/admin/posts/settings`                          | `src/controllers/admin/posts.admin.controller.ts`          |
| `GET`    | `/admin/blog/categories`                         | `src/controllers/admin/taxonomy.admin.controller.ts`       |
| `POST`   | `/admin/blog/categories`                         | `src/controllers/admin/taxonomy.admin.controller.ts`       |
| `PATCH`  | `/admin/blog/categories/:id`                     | `src/controllers/admin/taxonomy.admin.controller.ts`       |
| `DELETE` | `/admin/blog/categories/:id`                     | `src/controllers/admin/taxonomy.admin.controller.ts`       |
| …        | _47 more routes — see OpenAPI_                   |                                                            |

For request/response examples, error codes, and rate limits, see [../../api/services/blog.md](../../api/services/blog.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/database`
- `@nestlancer/cache`
- `@nestlancer/auth-lib`
- `@nestlancer/search`
- `@nestlancer/testing`
- `@nestlancer/outbox`

---

## 🔌 External integrations

- Media
- CDN cache invalidation

---

## 📨 Domain events (outbox)

_This service may consume events but does not publish primary domain events — check code for outbox writes._

---

## ⚙️ Configuration

| Variable            | Purpose                                 |
| :------------------ | :-------------------------------------- |
| `BLOG_SERVICE_PORT` | HTTP port (default 3014)                |
| `DATABASE_URL`      | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`         | Cache / rate limits where used          |
| `RABBITMQ_URL`      | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/blog-service dev

# Unit + integration tests
pnpm --filter @nestlancer/blog-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3014/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/blog/tests/unit/`
- E2E: `services/blog/tests/e2e/` (hits HTTP with Supertest)
- Cross-service flows: [testing strategy](../../guides/testing-strategy.md), [test commands](../../guides/test-commands.md)

---

## 🛠 Operations

- Health: included in gateway `GET /api/v1/health` aggregation
- Logs: JSON with `X-Correlation-ID` from gateway
- Metrics: Prometheus scrape via `@nestlancer/metrics`

---

## 📚 Related documentation

- [System architecture](../../architecture/overview.md)
- [Database schema](../../architecture/database-schema.md)
- [Adding a new service](../../guides/adding-new-service.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)

---

<div align="center">

**Blog Service** — Nestlancer backend component documentation

</div>
