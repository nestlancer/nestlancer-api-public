<div align="center">

# Documentation maintenance

### How this repo’s docs stay accurate and what to verify after changes.

</div>

---

## 📖 Table of Contents

- [Layout (canonical)](#layout-canonical)
- [Regenerate after code changes](#regenerate-after-code-changes)
- [Cross-repo links (frontend)](#cross-repo-links-frontend)
- [Known pitfalls (audited 2026-06)](#known-pitfalls-audited-2026-06)
- [Last audit checklist](#last-audit-checklist)

---

## Layout (canonical)

| Path                 | Purpose                                                      |
| :------------------- | :----------------------------------------------------------- |
| `docs/README.md`     | Master index — start here                                    |
| `docs/components/`   | Gateway, services, workers, libs (operational)               |
| `docs/api/`          | OpenAPI mirror + per-service endpoint specs                  |
| `docs/architecture/` | System design (verify ports against `modification-playbook`) |
| `docs/guides/`       | How-to and onboarding                                        |
| `docs/archive/`      | Historical only — may reference old paths                    |
| `CHANGELOG.md`       | Generated from git — do not hand-edit                        |

---

## Regenerate after code changes

```bash
node scripts/generate-component-docs.mjs   # services, workers, libs
node scripts/generate-changelog.mjs        # CHANGELOG.md (sanitizes commit messages)
```

---

## Cross-repo links (frontend)

The frontend repo links to this backend with paths like:

`../../../../nestlancer-backend-api/docs/...`

**Requirement:** Clone both repos as siblings:

```
workspace/
├── nestlancer-backend-api/
└── nestlancer-frontend/
```

If your layout differs, adjust links or use the backend docs URL in your org.

---

## Known pitfalls (audited 2026-06)

1. **Service ports** — Use [modification-playbook § ports](guides/modification-playbook.md#service-port-quick-reference), not stale tables in old archive docs.
2. **Auth vs ws-gateway** — Both may use 3001 in code; Docker Compose maps different host ports.
3. **Postman file** — No committed `postman-collection.json`; import from `docs/api/openapi-merged.json`.
4. **Archive** — `reference-docs/` was removed; specs live under `docs/api/services/`.
5. **Changelog** — Regenerate to avoid broken `cci:` links from old commit messages.

---

## Last audit checklist

- [ ] `node scripts/generate-component-docs.mjs` run after controller changes
- [ ] `pnpm contract:refresh` after API changes
- [ ] Port table in `architecture/overview.md` matches env defaults
- [ ] New service has `docs/components/services/<name>.md` + `docs/api/services/<name>.md`
- [ ] Frontend `pnpm pull:openapi && pnpm codegen` after API changes
