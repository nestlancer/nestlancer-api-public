<div align="center">

# Adding a New Service

</div>

---

## Step-by-Step

### 1. Create Service Directory

```bash
mkdir -p services/<name>/src
cd services/<name>
```

### 2. Initialize Package

Create `package.json`:

```json
{
  "name": "@nestlancer/<name>",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "test": "jest"
  },
  "dependencies": {
    "@nestlancer/common": "workspace:*",
    "@nestlancer/config": "workspace:*",
    "@nestlancer/database": "workspace:*",
    "@nestlancer/cache": "workspace:*",
    "@nestlancer/auth-lib": "workspace:*",
    "@nestlancer/logger": "workspace:*",
    "@nestlancer/metrics": "workspace:*"
  }
}
```

### 3. Add to Workspace

Verify `services/*` is already in `pnpm-workspace.yaml` (it should be).

### 4. Create NestJS Scaffold

- `src/main.ts` – Bootstrap with ConfigModule and standard middleware
- `src/app.module.ts` – Import shared modules
- `src/<name>.module.ts` – Feature module
- `src/<name>.controller.ts` – REST endpoints
- `src/<name>.service.ts` – Business logic
- `src/<name>.repository.ts` – Database access

### 5. Create Dockerfile

Extend `docker/service-base/Dockerfile.base`:

```dockerfile
FROM nestlancer/service-base:latest AS builder
COPY services/<name> ./services/<name>
RUN pnpm build --filter=@nestlancer/<name>
```

### 6. Add K8s Manifests

```bash
mkdir -p deploy/kubernetes/services/<name>
# Create: deployment.yaml, service.yaml, hpa.yaml, kustomization.yaml
```

### 7. Add Gateway Route

Update `gateway/src/routes.config.ts` to proxy to the new service.

### 8. Create Prisma Models

Add `prisma/schema/<name>.prisma` with domain models.

### 9. Add Health Endpoint

Implement `GET /api/v1/health` returning service health status.

### 10. Update Project Tracker

Update service documentation under `docs/components/services/<name>.md` and `docs/api/services/<name>.md`.

---

<div align="center">

**Adding a New Service** — Nestlancer guide

</div>
