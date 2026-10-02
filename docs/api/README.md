<div align="center">

# API documentation

### The canonical OpenAPI contract is the **gateway merged spec**, not hand-maintained YAML.

</div>

---

## 📖 Table of Contents

- [Sources](#sources)
- [Refresh workflow](#refresh-workflow)
- [Human-readable references](#human-readable-references)
- [Legacy stub](#legacy-stub)

---

## Sources

| Source                   | Location                                                                            |
| :----------------------- | :---------------------------------------------------------------------------------- |
| Live (authoritative)     | `GET /docs-all-json` on the API gateway                                             |
| Committed backend mirror | [`openapi-merged.json`](openapi-merged.json) (generate via `pnpm contract:refresh`) |
| Frontend mirror          | `nestlancer-frontend/swagger-docs/openapi-gateway.json`                             |

---

## Refresh workflow

```bash
# After Swagger / controller changes (gateway must be running)
pnpm contract:refresh    # export live spec → openapi-merged.json
pnpm contract:check      # Spectral lint (also runs on git pre-push)

# Frontend client
cd ../nestlancer-frontend && pnpm openapi:refresh
```

See [`scripts/openapi/README.md`](../../scripts/openapi/README.md) for codemods and merge policy.

---

## Human-readable references

| Document                                         | Description                                     |
| :----------------------------------------------- | :---------------------------------------------- |
| [standards.md](standards.md)                     | Versioning, auth, envelopes, pagination, errors |
| [error-codes.md](error-codes.md)                 | Application error code catalog                  |
| [endpoints-reference.md](endpoints-reference.md) | Cross-service endpoint index                    |
| [services/](services/)                           | Per-domain endpoint specifications              |

---

## Legacy stub

The old ~11-path YAML is archived under [`_legacy/`](_legacy/README.md). Do not use it for codegen or validation.
