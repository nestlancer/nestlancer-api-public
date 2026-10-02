<div align="center">

# Legacy API contract (archived)

### The ~11-operation hand-maintained OpenAPI YAML stub was retired in favor of the **gateway merged spec**.

</div>

---

## Canonical contract (use these)

| Artifact        | Location                                                |
| :-------------- | :------------------------------------------------------ |
| Live            | `GET /docs-all-json` on the API gateway                 |
| Backend mirror  | [`../openapi-merged.json`](../openapi-merged.json)      |
| Frontend mirror | `nestlancer-frontend/swagger-docs/openapi-gateway.json` |

---

## Workflow

```bash
# Backend
pnpm contract:refresh
pnpm contract:check

# Frontend
pnpm openapi:refresh
pnpm contract:check
```

See [`../../../scripts/openapi/README.md`](../../../scripts/openapi/README.md).
