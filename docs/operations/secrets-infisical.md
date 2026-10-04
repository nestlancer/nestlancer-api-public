<div align="center">

# Infisical — Step-by-Step Guide (Nestlancer Backend)

</div>

---

## 📖 Table of Contents

- [What you get](#what-you-get)
- [Architecture (Nestlancer)](#architecture-nestlancer)
- [Phase 1 — Account & project (15 min)](#phase-1-account-project-15-min)
- [Phase 2 — Install CLI (5 min)](#phase-2-install-cli-5-min)
- [Phase 3 — Link repo & import secrets (30 min)](#phase-3-link-repo-import-secrets-30-min)
- [Phase 4 — Local development with Docker (20 min)](#phase-4-local-development-with-docker-20-min)
- [Phase 5 — E2E & tests (15 min)](#phase-5-e2e-tests-15-min)
- [Phase 6 — Production VPS (30 min)](#phase-6-production-vps-30-min)
- [Phase 7 — GitHub Actions (CI/CD)](#phase-7-github-actions-cicd)
- [Phase 8 — Team onboarding](#phase-8-team-onboarding)
- [Daily command reference](#daily-command-reference)
- [Troubleshooting](#troubleshooting)
- [Security checklist](#security-checklist)
- [Related docs](#related-docs)
- [References](#references)

---

## What you get

| Before                                                           | After                                    |
| :--------------------------------------------------------------- | :--------------------------------------- |
| `.env.development`, `.env.e2e`, `.env.production` edited by hand | One source of truth in Infisical UI      |
| Secrets copied to VPS manually                                   | Export or inject on deploy               |
| 20+ Docker services each need the same file                      | One `infisical run` feeds all containers |

**Free tier fits us:** 3 projects, **3 environments per project**, 5 machine identities — see [Infisical Pricing](https://infisical.com/pricing).

---

## Architecture (Nestlancer)

```
Infisical Cloud
└── Project: nestlancer-backend
    ├── development   ←  was .env.development
    ├── e2e           ←  was .env.e2e
    └── production    ←  was .env.production
         │
         ├── infisical export  →  .env.infisical  →  docker-compose.dev.yml (local + VPS)
         ├── infisical export  →  .env.production on VPS (prod, later)
         └── GitHub Actions (Universal Auth)  →  `.github/workflows/cd.yml`
```

All microservices share the same secrets per environment (same as today’s single `env_file` in Compose).

---

## Phase 1 — Account & project (15 min)

### Step 1: Sign up

1. Go to [app.infisical.com/signup](https://app.infisical.com/signup)
2. Create an organization (e.g. `Nestlancer`)
3. Enable **2FA** on your account (recommended)

### Step 2: Create project

1. **Create project** → name: `nestlancer-backend`
2. Note the **project slug** (Project Settings) — you need it for CLI and GitHub Actions

### Step 3: Configure environments

Infisical projects ship with default environments. Rename or use them to match our repo:

| Infisical environment slug | Was local file     | Used by                     |
| :------------------------- | :----------------- | :-------------------------- |
| `dev`                      | `.env.development` | Docker dev stack, CD deploy |
| `e2e`                      | `.env.e2e`         | E2E compose / system tests  |
| `production` (or `prod`)   | `.env.production`  | Production VPS (later)      |

**Important:** Our repo uses slug **`dev`** (see `.infisical.json` → `defaultEnvironment`). All CLI/scripts use `--env=dev`. Do not mix `dev` and `development` unless both exist in Infisical.

### Step 4: Optional folders (recommended)

In the Infisical UI, create folders to group secrets (easier than one flat list):

| Folder      | Examples                                                                               |
| :---------- | :------------------------------------------------------------------------------------- |
| `/shared`   | `DATABASE_URL`, `DATABASE_READ_URL`, `MIGRATION_DATABASE_URL`, `REDIS_*`, `RABBITMQ_*` |
| `/auth`     | `JWT_*`                                                                                |
| `/payments` | `RAZORPAY_*`                                                                           |
| `/storage`  | `S3_*`, `STORAGE_BUCKET_*`, Cloudflare CDN                                             |

You can also import first and reorganize later.

---

## Phase 2 — Install CLI (5 min)

### Linux (Ubuntu / Debian — typical VPS & dev machine)

```bash
curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical
infisical --version
```

Other platforms: [Install docs](https://infisical.com/docs/cli/overview) (macOS `brew`, npm `@infisical/cli`, etc.)

### Log in (developers)

```bash
infisical login
```

Follow the browser flow. For WSL / headless servers:

```bash
infisical login -i
```

---

## Phase 3 — Link repo & import secrets (30 min)

Run all commands from the **backend repo root** (`nestlancer-backend-api/`).

### Step 5: Initialize project link

```bash
cd /path/to/nestlancer-backend-api
infisical init
```

This creates `.infisical.json` (project ID + settings). **Safe to commit** — it contains no secret values.

Example `.infisical.json` (after init, values come from the UI):

```json
{
  "workspaceId": "<your-workspace-id>",
  "defaultEnvironment": "dev",
  "gitBranchToEnvironmentMapping": null
}
```

### Step 6: Import existing `.env` files

Use the environment slug that matches your Infisical environment.

**Option A — CLI file import (recommended, recent CLI):**

```bash
# Development
infisical secrets set --file=".env.development" --env=dev

# E2E
infisical secrets set --file=".env.e2e" --env=e2e

# Production (run from a secure machine; file contains real secrets)
infisical secrets set --file=".env.production" --env=production
```

**Option B — Dashboard:** Project → environment → **Import** / paste key-value pairs.

**Option C — Export format round-trip:**

```bash
# If you already have secrets in Infisical, pull them:
infisical export --env=dev --format=dotenv > /tmp/check.env
```

### Step 7: Verify in UI

1. Open each environment in [app.infisical.com](https://app.infisical.com)
2. Spot-check: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `RABBITMQ_URL`
3. Fix any keys that failed import (comments / blank lines are skipped)

### Step 8: Add `.env.example` to git (no secrets)

Create a template with **keys and comments only** — never real values:

```bash
# Generate key names only (example — adjust if your .env has special formatting)
grep -E '^[A-Z_][A-Z0-9_]*=' .env.development | cut -d= -f1 | sort -u > .env.example.tmp
# Manually add comments per section, then:
# mv .env.example.tmp .env.example
```

Commit `.env.example` and `.infisical.json`. Keep `.env.*` in `.gitignore` (already ignored).

---

## Phase 4 — Local development with Docker (20 min)

`docker-compose.dev.yml` loads secrets from **`.env.infisical`** (gitignored). That file is generated by `scripts/docker/compose-dev.sh` before `up` / `start` / `restart`.

### Step 9: Prerequisites

1. Install Infisical CLI (Phase 2)
2. Log in: `infisical login` (or set `INFISICAL_TOKEN` for automation)
3. Repo linked via `.infisical.json` (Phase 3)

### Step 10: Run the dev stack (pnpm)

From repo root:

```bash
pnpm docker:build      # build image (no Infisical export needed)
pnpm docker:up         # export dev secrets → .env.infisical, then up -d
pnpm docker:ps
pnpm docker:logs:gateway
pnpm docker:down
```

Under the hood, `pnpm docker:up` runs:

```bash
bash scripts/docker/compose-dev.sh up -d
# → infisical export --env=dev --format=dotenv > .env.infisical
# → docker compose -f docker-compose.dev.yml up -d
```

Manual equivalent:

```bash
infisical export --env=dev --format=dotenv > .env.infisical
chmod 600 .env.infisical
docker compose -f docker-compose.dev.yml up -d
```

### Step 11: Run without Docker (single service)

```bash
infisical run --env=dev -- pnpm --filter @nestlancer/gateway dev
```

### Step 12: Prisma / DB commands

```bash
infisical run --env=dev -- pnpm db:migrate
# seed.sh exports Infisical itself. Services must be up.
bash seed/seed.sh --env=dev --phase=core,content
```

### Step 13: Remove `.env.development`

After Infisical `dev` has all keys and `pnpm docker:up` works:

```bash
rm -f .env.development   # local only — do not commit
```

Integration tests that still read `.env.development` from disk may need a follow-up (export or `infisical run`).

---

## Phase 5 — E2E & tests (15 min)

### Step 14: E2E Docker compose

```bash
infisical run --env=e2e -- docker compose -f docker-compose.e2e.yml up -d
```

### Step 15: System / Jest tests

Tests load `.env.e2e` from disk today. Either:

**A. Export before tests (minimal code change):**

```bash
infisical export --env=e2e --format=dotenv > .env.e2e
pnpm test:system
```

**B. Run tests under Infisical:**

```bash
infisical run --env=e2e -- pnpm test:system
```

Ensure `tests/system/setup/env.ts` still finds required variables (shell env from `infisical run` takes precedence).

---

## Phase 6 — Production VPS (30 min)

Use a **machine identity** (not your personal login) on the server and in CI.

### Step 16: Create machine identities

Create identities at **Organization Settings → Access Control → Identities**, then add each to the relevant project (**Project Settings → Machine Identities**).

| Identity name                       | Purpose                                                                     |
| :---------------------------------- | :-------------------------------------------------------------------------- |
| `github-actions-nestlancer-backend` | GitHub CD + VPS dev deploy (`INFISICAL_CLIENT_ID` / `SECRET`) — see Phase 7 |
| `backend-prod-vps`                  | Production server deploy (later)                                            |

For each identity:

1. Create identity at org level → **Universal Auth** → **Create Client Secret**
2. Add identity to project `nestlancer-backend` with read access to the target environment (`dev` or `production`)
3. Copy **Client ID** and **Client Secret** (secret shown once)

Full GitHub setup: see **Phase 7** below (`INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET`).

Docs: [Universal Auth](https://infisical.com/docs/documentation/platform/identities/universal-auth)

### Step 17: Authenticate on VPS

On the production server (one-time setup):

```bash
# Install CLI (same as Phase 2)
export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="<CLIENT_ID>" \
  --client-secret="<CLIENT_SECRET>" \
  --silent --plain)
```

Token is short-lived; for deploy scripts, login each run or use a deploy wrapper.

### Step 18: Deploy — export `.env.production`

**Option A — export file (closest to today):**

```bash
cd /path/to/nestlancer-backend-api

export INFISICAL_TOKEN=$(infisical login --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --silent --plain)

infisical export --env=production --format=dotenv > .env.production
chmod 600 .env.production

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

**Option B — inject without writing file:**

```bash
infisical run --env=production -- docker compose -f docker-compose.prod.yml up -d
```

Store `INFISICAL_CLIENT_ID` and `INFISICAL_CLIENT_SECRET` in a root-only file on VPS (e.g. `/root/.infisical-prod.env`, mode `600`), not in git.

### Step 19: Lock down old files

```bash
# After verifying production works
rm -f .env.production.bak
# Keep .env.production only if Option A; otherwise rely on infisical run
```

---

## Phase 7 — GitHub Actions (CI/CD)

Workflows: `.github/workflows/ci.yml` (validate) and `.github/workflows/cd.yml` (deploy dev stack).

### GitHub Secrets — what you need

#### CI (`ci.yml`) — **no secrets**

CI runs lint, format check, OpenAPI validation, build, and unit tests. It does **not** call Infisical. No GitHub Secrets required for CI.

#### CD (`cd.yml`) — **required secrets**

Add these in GitHub → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**:

| Secret                    | Required | Purpose                                                    |
| :------------------------ | :------- | :--------------------------------------------------------- |
| `INFISICAL_CLIENT_ID`     | Yes      | Machine identity Client ID (Universal Auth)                |
| `INFISICAL_CLIENT_SECRET` | Yes      | Machine identity Client Secret (shown once at creation)    |
| `VPS_HOST`                | Yes      | SSH host (Tailscale IP or hostname)                        |
| `VPS_USERNAME`            | Yes      | SSH user (e.g. `root`)                                     |
| `VPS_PASSWORD`            | Yes      | SSH password for the deploy user                           |
| `VPS_DEPLOY_PATH`         | No       | Repo path on VPS (default: `/root/nestlancer-backend-api`) |

**Removed / no longer used:** `DEV_DATABASE_URL` — use `DATABASE_URL` in Infisical `dev` on the VPS only.

**Not used on GitHub runner:** CD does not fetch Infisical or connect to the database (Tailscale IPs are unreachable from Actions). Migrations are **manual** on the VPS; see `scripts/db/migrate-deploy.sh`.

Hardcoded in `cd.yml` (not GitHub secrets):

- `project-slug: nestlancer-backend`
- `env-slug: dev`

---

### How to get `INFISICAL_CLIENT_ID` and `INFISICAL_CLIENT_SECRET`

These come from an Infisical **machine identity** using **Universal Auth** (matches our CD workflow).  
Official docs: [Universal Auth](https://infisical.com/docs/documentation/platform/identities/universal-auth).

#### What they are

| Value             | Description                                                                  |
| :---------------- | :--------------------------------------------------------------------------- |
| **Client ID**     | Public identifier for the machine identity (safe to store in GitHub Secrets) |
| **Client Secret** | Private credential — shown **only once** when you create it                  |

GitHub Actions and the VPS use them to obtain a short-lived `INFISICAL_TOKEN`, then read secrets from project `nestlancer-backend`, environment `dev`.

#### Step-by-step

1. **Log in** to [app.infisical.com](https://app.infisical.com) (or [eu.infisical.com](https://eu.infisical.com) for EU).

2. **Create a machine identity** (organization level):
   - **Organization Settings** → **Access Control** → **Identities**
   - **Create identity**
   - Name: e.g. `github-actions-nestlancer-backend`
   - Role: org role that can access projects (e.g. member)
   - **Create**

3. **Copy Client ID:**
   - Open the new identity → **Universal Auth** (enabled by default)
   - Copy **Client ID** → GitHub secret `INFISICAL_CLIENT_ID`

4. **Create Client Secret:**
   - Click **Create Client Secret**
   - Optional description: `GitHub CD + VPS deploy`
   - TTL `0` = no expiry (or set rotation policy)
   - Copy the secret immediately → GitHub secret `INFISICAL_CLIENT_SECRET`
   - If lost, create a new client secret (old one cannot be viewed again)

5. **Add identity to project** (required for reading secrets):
   - Open project **`nestlancer-backend`**
   - **Project Settings** → **Access Control** → **Machine Identities** → **Add identity**
   - Select your identity
   - Project role: at least read access to secrets in **`dev`** (e.g. Viewer/Developer)
   - Save

6. **Add to GitHub:**
   - Repo → **Settings** → **Secrets and variables** → **Actions**
   - New repository secrets: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`

7. **Verify locally (optional):**

   ```bash
   export INFISICAL_TOKEN=$(infisical login \
     --method=universal-auth \
     --client-id="YOUR_CLIENT_ID" \
     --client-secret="YOUR_CLIENT_SECRET" \
     --silent --plain)

   infisical export --env=dev --format=dotenv | head -5
   ```

   You should see keys such as `DATABASE_URL`.

#### Common mistakes

| Problem                | Fix                                                                        |
| :--------------------- | :------------------------------------------------------------------------- |
| Invalid credentials    | Wrong ID/secret or expired client secret                                   |
| Forbidden / no secrets | Identity not added to project `nestlancer-backend` or role too low         |
| Wrong environment      | Use slug `dev` (not `development`) unless that slug exists in Infisical    |
| EU cloud               | Set `INFISICAL_API_URL=https://eu.infisical.com` in workflow/VPS if needed |

---

### What CD does with these secrets

**On GitHub runner** (no Infisical, no database):

1. Checkout, `pnpm install`, `pnpm db:generate`, `pnpm build` (same as CI)

**On VPS via SSH** (Infisical + Docker only):

1. `git pull origin main`
2. `infisical login --method=universal-auth ...` (using secrets passed from GitHub)
3. `infisical export --env=dev --format=dotenv > .env.infisical`
4. `docker compose -f docker-compose.dev.yml build && up -d`

**Not in CD:** `pnpm db:migrate:deploy`. After schema changes, SSH to the VPS and run `./scripts/db/migrate-deploy.sh` (or `pnpm db:migrate:deploy:manual`) when you choose to apply migrations. Requires `MIGRATION_DATABASE_URL` in `.env.infisical` (DDL user `nl_platform_migrate` — add in Infisical manually, not in app runtime containers).

**VPS requirements:** Infisical CLI installed, Docker, repo cloned at `VPS_DEPLOY_PATH`, Tailscale access to database host.

---

### Optional upgrade: OIDC (no client secret in GitHub)

Infisical recommends [OIDC for GitHub Actions](https://infisical.com/docs/integrations/cicd/githubactions) so you do not store long-lived `CLIENT_ID` / `CLIENT_SECRET` in GitHub.

Our `cd.yml` currently uses **Universal Auth** (simpler setup). To switch later:

1. Project → Machine Identities → create `github-actions` with **OIDC Auth**
2. Discovery URL: `https://token.actions.githubusercontent.com`
3. Subject: `repo:<org>/nestlancer-backend-api:ref:refs/heads/main`
4. Audience: `https://github.com/<your-org>`
5. Change workflow to `method: oidc` and `identity-id: <ID>` (Identity ID is public, not a secret)

See `cd.yml` header comments and [GitHub Actions integration](https://infisical.com/docs/integrations/cicd/githubactions).

---

## Phase 8 — Team onboarding

### New developer checklist

1. Get invited to Infisical organization (Project → Members)
2. Install CLI + `infisical login`
3. Clone repo (`.infisical.json` already present)
4. Run: `pnpm docker:up` (or `infisical export --env=dev ...` — see Phase 4)
5. **Do not** ask for `.env.development` over Slack — use Infisical

### Changing a secret

1. Update in Infisical UI (correct environment)
2. Restart affected containers:

```bash
pnpm docker:up --force-recreate
# or: infisical export --env=dev --format=dotenv > .env.infisical && docker compose -f docker-compose.dev.yml up -d --force-recreate
```

---

## Daily command reference

| Task              | Command                                                       |
| :---------------- | :------------------------------------------------------------ |
| Start dev stack   | `pnpm docker:up`                                              |
| Stop dev stack    | `pnpm docker:down`                                            |
| Build dev image   | `pnpm docker:build`                                           |
| List secrets      | `infisical secrets --env=dev`                                 |
| Set one secret    | `infisical secrets set KEY=value --env=dev`                   |
| Export for Docker | `infisical export --env=dev --format=dotenv > .env.infisical` |
| Run any command   | `infisical run --env=dev -- <command>`                        |

---

## Troubleshooting

| Problem                              | Fix                                                                                |
| :----------------------------------- | :--------------------------------------------------------------------------------- |
| `infisical: command not found`       | Reinstall CLI; check `PATH`                                                        |
| Wrong project / env                  | Run `infisical init` again; check `--env=` slug in UI                              |
| Auth failed on VPS                   | Regenerate machine identity secret; check `INFISICAL_TOKEN`                        |
| Compose still uses old env           | Remove `.env.development`; re-run `pnpm docker:up` to refresh `.env.infisical`     |
| `Not logged in to Infisical` (local) | Run `infisical login` or set `INFISICAL_TOKEN`                                     |
| CD: Infisical auth failed            | Check `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET`; identity added to project |
| CD: Invalid authentication method    | In `cd.yml` use `method: universal` for secrets-action (not `universal-auth`)      |
| CD: Project slug not found (404)     | Use project id from `.infisical.json` (CD uses CLI `--projectId`, not slug)        |
| CD: ENOENT `.infisical.json`         | Commit `.infisical.json` (not gitignored) or set `INFISICAL_PROJECT_ID` secret     |
| CD: VPS export failed                | Install Infisical CLI on VPS; verify machine identity can read `dev`               |
| CD: P1001 can't reach DB on GitHub   | Expected if migrations ran on Actions; CD no longer migrates — apply on VPS only   |
| GitHub OIDC failed (if using OIDC)   | Add `id-token: write`; fix Subject/Audience on identity                            |
| EU region                            | `export INFISICAL_API_URL=https://eu.infisical.com`                                |
| Self-hosted later                    | Set `INFISICAL_API_URL` to your instance URL                                       |

---

## Security checklist

- [ ] Enable 2FA on all Infisical users
- [ ] Never commit `.env.development`, `.env.infisical`, `.env.e2e`, `.env.production`
- [ ] Commit `.env.example` and `.infisical.json` only
- [ ] Use machine identities for VPS/CI (not personal accounts)
- [ ] GitHub CD: set `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `VPS_*` secrets
- [ ] Consider GitHub OIDC later to avoid long-lived client secrets in GitHub
- [ ] Restrict production identity to `production` environment only
- [ ] Rotate JWT/payment secrets in Infisical when compromised

---

## Related docs

- [Environment Variables Reference](../reference/environment-variables.md)
- `envfile-report-new.md` (repo root)
- [Docker Compose integration](https://infisical.com/docs/integrations/platforms/docker-compose)
- [CLI quickstart](https://infisical.com/docs/cli/usage)
- [GitHub Actions](https://infisical.com/docs/integrations/cicd/githubactions)

---

## References

- [Infisical](https://infisical.com/)
- [Infisical Pricing](https://infisical.com/pricing)
- [CLI install](https://infisical.com/docs/cli/overview)

---

<div align="center">

**Infisical — Step-by-Step Guide (Nestlancer Backend)** — Nestlancer guide

</div>
