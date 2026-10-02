# Seed

One command fills Postgres and MinIO. Payloads are JSON. Writes go through the admin and media APIs, except the first admin user, which is inserted with SQL only when login fails.

```bash
# Local: wipe, then core, blogs, portfolio, and demo clients
bash seed/seed.sh --env=dev

# Catalog only (what pnpm db:seed runs)
bash seed/seed.sh --env=dev --phase=core,content

# Production host: no reset, no demo clients
bash seed/seed.sh --env=prod --phase=core,content --skip-export
```

`--env=prod` rejects `reset` and `demo` unless you also pass `--confirm-prod`.

| Phase | What it loads | How |
| --- | --- | --- |
| reset | nothing | Truncate rows and empty buckets. Schema stays. |
| core | `payloads/taxonomy`, `payloads/core`, `payloads/commerce` | Admin API |
| blogs | `payloads/blogs` | Blog API and media upload |
| portfolio | `payloads/portfolio` | Portfolio API and media upload |
| content | blogs and portfolio | Both of the above |
| demo | `payloads/demo` | Real client and admin APIs |

`content` is the name used on the command line. `init` is accepted and means `core`.

The old `prod-data/run-seed.sh` path still works and forwards here. `pnpm db:seed` runs `core` and `content` only.

Admin and demo password default: `REDACTED_DEMO_PASSWORD` (`ADMIN_PASSWORD` / `CLIENT_PASSWORD` override it). `ADMIN_EMAIL` defaults to `admin@nestlancer.com`.

Re-runs are safe. Existing blog slugs are left in place. Portfolio thumbnails are uploaded again only when the public item has no thumbnail, or when the file hash in `seed/.generated/ledger.json` changed.

---

## Manual seed

Run every command from the backend repo root, on the machine where that environment's containers are running. The API stack must already be up. Seeding logs in as admin and writes through the services, so Postgres and MinIO stay paired.

### 1. See which environment `.env.infisical` points at

This prints the database name, MinIO endpoint, and bucket names. It does not print passwords.

```bash
python3 - << 'PY'
from pathlib import Path
env = {}
for line in Path(".env.infisical").read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, _, v = line.partition("=")
    env[k.strip()] = v.strip().strip("'").strip('"')

def db_name(url: str) -> str:
    if not url:
        return "(missing)"
    return url.split("?", 1)[0].rsplit("/", 1)[-1]

def host_of(url: str) -> str:
    if not url or "@" not in url:
        return url or "(missing)"
    return url.split("@", 1)[1].split("/", 1)[0]

print("NODE_ENV", env.get("NODE_ENV"))
print("DATABASE", host_of(env.get("DATABASE_URL", "")), db_name(env.get("DATABASE_URL", "")))
print("S3_ENDPOINT", env.get("S3_ENDPOINT"))
print("BUCKETS", ", ".join(env[k] for k in sorted(env) if k.startswith("STORAGE_BUCKET_")))
PY
```

Production looks like `NODE_ENV=production`, database `nl_platform_prod`, and bucket names starting with `nl-prod-`. If the file is missing or points at the wrong database, export the one you mean:

```bash
infisical login          # once per machine
infisical export --env=prod --format=dotenv > .env.infisical
chmod 600 .env.infisical
```

Use `--env=dev` for the dev stack. Do not seed until the database name in the check above is the one you intend to change.

### 2. Confirm the API containers are up

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'nl-prod-auth|nl-svc-auth|nl-auth'
```

Prod compose does not publish app ports on the host. `seed.sh` detects `nl-prod-auth` and calls each service on the Docker network. Leave `API_BASE_URL` unset. Set `SEED_FORCE_GATEWAY=1` only when you must go through the public gateway.

### 3. Run one phase at a time

`--skip-export` keeps the `.env.infisical` you just checked.

Development, catalog only:

```bash
bash seed/seed.sh --env=dev --phase=core --skip-export
bash seed/seed.sh --env=dev --phase=blogs --skip-export
bash seed/seed.sh --env=dev --phase=portfolio --skip-export
```

Development, demo clients after core is loaded:

```bash
bash seed/seed.sh --env=dev --phase=demo --skip-export
```

Production catalog (no wipe, no demo users):

```bash
bash seed/seed.sh --env=prod --phase=core --skip-export
bash seed/seed.sh --env=prod --phase=blogs --skip-export
bash seed/seed.sh --env=prod --phase=portfolio --skip-export
```

`content` is blogs and portfolio together: `--phase=core,content`.

`--env=prod` refuses `reset` and `demo` unless you also pass `--confirm-prod`. Reset truncates every row and empties the buckets. Do not use it on production unless that is the explicit goal.

### 4. Run a single Python script

Use this when you want one payload file, not a whole phase. Load the env file and point HTTP at the containers first.

```bash
set -a
source .env.infisical
set +a
export PROD_DATA_FORCE_INFISICAL=1
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-REDACTED_DEMO_PASSWORD}"
unset API_BASE_URL
source seed/scripts/use-docker-direct-urls.sh

python3 seed/phases/core.py --verify
python3 seed/phases/blogs.py
python3 seed/phases/portfolio.py
```

Demo pieces, dev only, in this order:

```bash
python3 seed/demo/scripts/generate_assets.py
python3 seed/demo/scripts/create_accounts.py
python3 seed/demo/scripts/seed_scenarios.py --workers 1
```

### 5. Check the rows

```bash
psql "$DATABASE_URL" -c '
SELECT '\''blog_posts'\'' AS what, count(*) FROM "BlogPost"
UNION ALL SELECT '\''portfolio'\'', count(*) FROM "PortfolioItem"
UNION ALL SELECT '\''blog_categories'\'', count(*) FROM "BlogCategory"
UNION ALL SELECT '\''email_templates'\'', count(*) FROM "EmailTemplate"
UNION ALL SELECT '\''feature_flags'\'', count(*) FROM "FeatureFlag";
'
```

Expected catalog size from `seed/payloads/`: 4 blog categories, 6 blog tags, 110 published posts, 4 portfolio categories, 8 published portfolio items, 10 email templates, 12 feature flags, 52 notification templates, 7 quote blocks, 1 service package. A second run does not add duplicate slugs.
