# `@nestlancer/tests` (not a working package)

⚠️ Anomalous package: only a root `jest.config.ts` is present — no `package.json`, `src/`, or `tests/` directory exists. The config targets `<rootDir>/src/**/*.ts` and `<rootDir>/tests/**/*.spec.ts`, neither of which exist. A 2026-era internal tracker (docs/archive, now retired) once listed this as "shared test factories and mocks", which today live in `libs/testing/` instead. No other package imports from `libs/tests`. Treat as a stale/incomplete scaffold pending a maintainer decision to delete it or build it out — do not assume it is a working package.

## Used by

Nothing currently (no caller found via repo-wide search)

## Related documentation

- [Reference: repository structure](../../reference/repository-structure.md)
- [Component index](../README.md)
