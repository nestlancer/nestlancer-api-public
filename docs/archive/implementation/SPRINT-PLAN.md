## Completed in this sprint

### Epic A — CD migration automation

- `scripts/db/migrate-deploy-ci.sh` — non-interactive `migrate deploy`
- `scripts/deploy/smoke-health.sh` — `/health/live` + `/health/ready`
- `scripts/deploy/rollback.sh` — git SHA rollback + compose restart
- `.github/workflows/cd.yml` — migrate → compose up → smoke; rollback on failure

### Epic B — Frontend CI E2E

- `.github/workflows/ci.yml` — unit tests + mocked Playwright (smoke, payment, requests)

### Epic C — Orval requests pilot

- `apps/web/src/features/requests/hooks/useRequestsApi.ts`
- Migrated `RequestsListClient`, `RequestDetailClient`, `NewRequestClient`
- Deprecated `packages/api-client/src/services/requests.service.ts`

### Epic D — Vitest

- `packages/api-client/src/utils/peel-success-envelope.test.ts`
- `apps/web/src/features/auth/hooks/useLogin.test.ts`
- `apps/web/src/features/payments/hooks/usePaymentCheckout.test.ts`

### Epic E — K3s + Terraform

- `deploy/terraform/modules/vps-k3s/` — SSH install K3s, fetch kubeconfig
- `deploy/terraform/environments/production|staging/`
- `deploy/k3s/base/` + overlays (Traefik ingress)
- `docs/guides/production-vps-deploy.md`
- `.github/workflows/cd-staging.yml` (manual dispatch)

### Epic F — READMEs & doc drift

- Service READMEs: portfolio, blog, contact, webhooks, progress, messaging, notifications, media
- `docs/architecture/overview.md` — auth port 3001

### Epic G — OAuth cleanup

- Removed unused `SocialLogin.tsx`

### Epic H — Push

- `nestlancer-frontend/docs/guides/web-push-testing.md`

### Epic I — E2E

- `apps/web/tests/e2e/login-2fa.mocked.spec.ts`
- `apps/landing/tests/e2e/smoke.spec.ts` + `playwright.config.ts`

### Epic J — Production deployment (deployment-ready)

- `docker-compose.prod.yml` — all 16 services + 8 workers + gateways (generated)
- `scripts/docker/build-prod-image.sh`, `build-all-prod-images.sh`, `compose-prod.sh`
- `scripts/docker/workloads.manifest.json` + `generate-prod-compose.mjs`
- `deploy/k3s/base/workloads/` — 44 Deployment/Service manifests (generated)
- `scripts/deploy/generate-k3s-manifests.mjs`
- `.github/workflows/build-images.yml` — GHCR image matrix
- `.github/workflows/cd-production.yml` — production VPS deploy
- `.github/dependabot.yml` (backend + frontend)
- Orval: `useQuotesApi`, `usePaymentsApi`, `useProjectsApi` + client migrations
- `nestlancer-frontend/docker/Dockerfile.web` + `output: 'standalone'` for web app

---

## Next sprint backlog

- Orval migration: admin app + remaining web features (messaging, media, settings)
- Terraform remote state + wire `cd-production` to pull GHCR by default
- CodeQL, OpenAPI PR diff in CI
- Split `gateway/src/modules/admin/admin.controller.ts`
- Frontend `cd.yml` for web/admin/landing VPS or Vercel
- Expand Vitest coverage (target ≥10 tests in web app)
