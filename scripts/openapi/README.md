<div align="center">

# OpenAPI contract (backend)

### The **canonical** API contract is the gateway merged spec served at `/docs-all-json`, not hand-maintained YAML.

</div>

---

## 📖 Table of Contents

- [Workflow](#workflow)
- [⌨ Scripts](#scripts)
- [Gateway merge policy](#gateway-merge-policy)

---

## Workflow

1. Change NestJS Swagger decorators / DTOs / gateway controllers.
2. Restart gateway: `pnpm docker:restart gateway` (or full stack).
3. Export fresh merged spec: `pnpm contract:refresh` (or `OPENAPI_URL=http://127.0.0.1:3000/docs-all-json pnpm openapi:export`).
4. Lint: `pnpm contract:check` (Spectral on `docs/api/openapi-merged.json`).
5. Frontend: `cd ../nestlancer-frontend && pnpm openapi:refresh`.

---

## ⌨ Scripts

| Script                           | Purpose                                                                           |
| :------------------------------- | :-------------------------------------------------------------------------------- |
| `openapi:export`                 | Pull live merged JSON → `docs/api/openapi-merged.json` (+ normalize for Spectral) |
| `normalize-openapi-document.mjs` | Strip `/regex/` delimiters and invalid nested `required` booleans                 |
| `openapi:lint:merged`            | Export from live gateway + Spectral                                               |
| `openapi:lint`                   | Spectral on committed `openapi-merged.json` (offline)                             |
| `contract:check`                 | `openapi:lint` — run before push (Husky)                                          |
| `contract:refresh`               | `openapi:export` — refresh committed mirror                                       |
| `openapi:diff`                   | Compare `openapi-merged.json` to `.baseline` (local breaking-change check)        |
| `openapi:gateway-params`         | Codemod `@ApiParam` on gateway proxy routes                                       |
| `openapi:gateway-responses`      | Codemod `@ApiStandardResponses()` on gateway proxies                              |

---

## Gateway merge policy

- Gateway proxy routes are merged **first** (canonical public URLs).
- Admin microservice internal paths (`/api/dashboard`, etc.) are **excluded** — use `/api/v1/admin/*` only.
- Blog public paths duplicate gateway `/api/v1/blog/*` and are excluded from the blog service spec.
