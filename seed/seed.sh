#!/usr/bin/env bash
# Single Nestlancer seed entry point.
#
#   bash seed/seed.sh --env=dev
#   bash seed/seed.sh --env=dev --phase=core,content
#   bash seed/seed.sh --env=prod --phase=core,content --skip-export
#
# --layers is accepted as an alias of --phase.
#   init      -> core
#   content   -> blogs + portfolio
#   blogs, portfolio, demo, reset stay as named
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

INFISICAL_ENV_NAME=""
SKIP_EXPORT=0
PHASES=""
MIGRATE="${INIT_MIGRATE:-}"
ADMIN_PASSWORD_CLI=""
CONFIRM_PROD=0
ENV_FILE="${INFISICAL_ENV_FILE:-.env.infisical}"

usage() {
  cat <<'EOF'
Usage: bash seed/seed.sh --env=<dev|prod> [options]

Required:
  --env=dev|prod          Infisical environment to export and seed

Options:
  --phase=LIST            reset, core, content, blogs, portfolio, demo
                          content means blogs and portfolio
                          Default: reset,core,content,demo
  --layers=LIST           Alias of --phase. init means core.
  --skip-export           Do not call Infisical; use .env.infisical or the current environment
  --migrate               Run Prisma migrate before the core phase
  --admin-password=PASS   Override ADMIN_PASSWORD (default: REDACTED_DEMO_PASSWORD)
  --confirm-prod          Allow reset or demo when --env=prod
  -h, --help              Show this help

Examples:
  bash seed/seed.sh --env=dev
  bash seed/seed.sh --env=dev --phase=core,content
  bash seed/seed.sh --env=prod --phase=core,content --skip-export
EOF
}

has_phase() {
  local needle="$1"
  [[ ",${PHASES}," == *",${needle},"* ]]
}

export_infisical() {
  if ! command -v infisical >/dev/null 2>&1; then
    echo "ERROR: infisical CLI not found. Install: https://infisical.com/docs/cli/overview" >&2
    exit 1
  fi
  if [[ -z "${INFISICAL_TOKEN:-}" ]]; then
    if ! infisical user get >/dev/null 2>&1; then
      echo "ERROR: Not logged in to Infisical. Run: infisical login" >&2
      echo "       Or set INFISICAL_TOKEN (machine identity)." >&2
      exit 1
    fi
  fi
  echo "[seed] Exporting Infisical env=${INFISICAL_ENV_NAME} → ${ENV_FILE}"
  infisical export --env="$INFISICAL_ENV_NAME" --format=dotenv >"$ENV_FILE"
  chmod 600 "$ENV_FILE"
}

print_target_summary() {
  python3 - <<'PY'
from pathlib import Path
import os

env = {}
path = Path(".env.infisical")
if path.exists():
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip("'").strip('"')
else:
    env = dict(os.environ)

def host_of(url: str) -> str:
    if not url:
        return "(missing)"
    if "@" in url and "://" in url:
        return url.split("@", 1)[1].split("?", 1)[0]
    return url.split("?", 1)[0]

db = env.get("DATABASE_URL", "")
mig = env.get("MIGRATION_DATABASE_URL", "")
print(f"[seed] NODE_ENV={env.get('NODE_ENV', '?')}")
print(f"[seed] DATABASE={host_of(db)}")
print(f"[seed] MIGRATE_DB={host_of(mig)}")
print(f"[seed] STORAGE_PROVIDER={env.get('STORAGE_PROVIDER', '?')}")
print(f"[seed] S3_ENDPOINT={env.get('S3_ENDPOINT', '(missing)')}")
buckets = [env[k] for k in sorted(env) if k.startswith("STORAGE_BUCKET_") and env[k]]
print(f"[seed] BUCKETS={', '.join(buckets) if buckets else '(none)'}")
PY
}

needs_schema_migrate() {
  python3 - <<'PY'
from pathlib import Path
import os
import subprocess
import sys

env = dict(os.environ)
path = Path(".env.infisical")
if path.exists():
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip("'").strip('"')

url = env.get("MIGRATION_DATABASE_URL") or env.get("DATABASE_URL") or ""
if not url:
    sys.exit(1)
sql = """
SELECT COUNT(*)::text
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
"""
r = subprocess.run(["psql", url, "-t", "-A", "-q", "-c", sql], capture_output=True, text=True)
if r.returncode != 0:
    sys.exit(0)
count = (r.stdout or "").strip() or "0"
sys.exit(0 if count == "0" else 1)
PY
}

for arg in "$@"; do
  case "$arg" in
    --env=*)
      INFISICAL_ENV_NAME="${arg#--env=}"
      ;;
    --phase=*|--layers=*)
      PHASES="${arg#*=}"
      ;;
    --skip-export)
      SKIP_EXPORT=1
      ;;
    --migrate)
      MIGRATE=1
      ;;
    --admin-password=*)
      ADMIN_PASSWORD_CLI="${arg#--admin-password=}"
      ;;
    --confirm-prod)
      CONFIRM_PROD=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$INFISICAL_ENV_NAME" ]]; then
  echo "ERROR: --env=dev|prod is required" >&2
  usage >&2
  exit 1
fi

case "$INFISICAL_ENV_NAME" in
  dev|prod|production)
    if [[ "$INFISICAL_ENV_NAME" == "production" ]]; then
      INFISICAL_ENV_NAME="prod"
    fi
    ;;
  *)
    echo "ERROR: --env must be dev or prod (got: $INFISICAL_ENV_NAME)" >&2
    exit 1
    ;;
esac

if [[ -z "$PHASES" ]]; then
  PHASES="reset,core,content,demo"
fi
PHASES="$(echo "$PHASES" | tr -d '[:space:]')"
PHASES="${PHASES//init/core}"
PHASES="${PHASES//content/blogs,portfolio}"

if [[ "$INFISICAL_ENV_NAME" == "prod" && "$CONFIRM_PROD" -eq 0 ]]; then
  if has_phase reset || has_phase demo; then
    echo "ERROR: reset and demo are blocked when --env=prod." >&2
    echo "       Seed catalog with --phase=core,content." >&2
    echo "       Pass --confirm-prod only when you intend to wipe or load demo clients." >&2
    exit 1
  fi
fi

export PROD_DATA_FORCE_INFISICAL=1
export INFISICAL_ENV="$INFISICAL_ENV_NAME"
export INFISICAL_ENV_FILE="$ENV_FILE"

echo "=== Nestlancer seed ==="
echo "[seed] env=${INFISICAL_ENV_NAME} phase=${PHASES}"

if [[ "$SKIP_EXPORT" -eq 0 ]]; then
  export_infisical
elif [[ ! -f "$ENV_FILE" && -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: ${ENV_FILE} not found and DATABASE_URL is unset" >&2
  exit 1
elif [[ ! -f "$ENV_FILE" ]]; then
  echo "[seed] No ${ENV_FILE}; using the current environment"
else
  echo "[seed] Skipping Infisical export (using existing ${ENV_FILE})"
fi

export ADMIN_PASSWORD="${ADMIN_PASSWORD_CLI:-${ADMIN_PASSWORD:-REDACTED_DEMO_PASSWORD}}"
export CLIENT_PASSWORD="${CLIENT_PASSWORD:-REDACTED_DEMO_PASSWORD}"

print_target_summary

configure_seed_http_targets() {
  if [[ -n "${API_BASE_URL:-}" && "${SEED_FORCE_GATEWAY:-0}" == "1" ]]; then
    echo "[seed] SEED_FORCE_GATEWAY=1 — using API_BASE_URL=${API_BASE_URL}"
    return 0
  fi

  if curl -sf --max-time 2 "http://127.0.0.1:3001/api/v1/auth/health" >/dev/null 2>&1 \
    || curl -sf --max-time 2 "http://127.0.0.1:3001/api/v1/health" >/dev/null 2>&1; then
    unset API_BASE_URL || true
    export API_BASE_URL=""
    echo "[seed] Using host-local microservice ports (direct; gateway bypassed)"
    return 0
  fi

  if docker inspect nl-prod-auth >/dev/null 2>&1; then
    # shellcheck disable=SC1091
    source "$ROOT/seed/scripts/use-docker-direct-urls.sh"
    return 0
  fi

  if [[ -n "${API_BASE_URL:-}" ]]; then
    echo "[seed] API_BASE_URL=${API_BASE_URL} (caller-provided; may be rate-limited)"
    return 0
  fi

  if [[ "$INFISICAL_ENV_NAME" == "prod" ]]; then
    export API_BASE_URL="${PROD_API_BASE_URL:-https://api.nestlancer.com/api/v1}"
  else
    export API_BASE_URL="${DEV_API_BASE_URL:-https://dev-api.nestlancer.com/api/v1}"
  fi
  echo "[seed] Direct microservices unreachable — using gateway API_BASE_URL=${API_BASE_URL}"
  echo "[seed] TIP: run on the app host with containers up to avoid rate limits"
}

configure_seed_http_targets

if [[ -z "$MIGRATE" ]] && has_phase core; then
  if needs_schema_migrate; then
    echo "[seed] Empty public schema detected — enabling Prisma migrate"
    MIGRATE=1
  fi
fi

if has_phase reset; then
  echo ""
  echo "=== Phase reset (S3 + database) ==="
  bash seed/reset/run-reset.sh
  bash seed/bust-http-cache.sh || true
fi

if [[ -z "$MIGRATE" ]] && has_phase core; then
  if needs_schema_migrate; then
    echo "[seed] Empty public schema detected — enabling Prisma migrate"
    MIGRATE=1
  fi
fi

if has_phase core; then
  echo ""
  echo "=== Phase core (platform baseline) ==="
  if [[ -n "$MIGRATE" ]]; then
    echo "[seed] Running Prisma migrate bootstrap ..."
    bash scripts/db/migrate-bootstrap.sh
  fi
  python3 seed/phases/core.py --verify
fi

if has_phase blogs; then
  echo ""
  echo "=== Phase blogs ==="
  python3 seed/phases/blogs.py
fi

if has_phase portfolio; then
  echo ""
  echo "=== Phase portfolio ==="
  python3 seed/phases/portfolio.py
fi

if has_phase demo; then
  echo ""
  echo "=== Phase demo ==="
  DEMO="seed/demo"
  python3 "$DEMO/scripts/download_avatar_images.py"
  python3 "$DEMO/scripts/enrich_profiles.py"
  python3 "$DEMO/scripts/generate_assets.py"
  python3 "$DEMO/scripts/create_accounts.py"
  MAX_DEMO_ATTEMPTS="${SEED_DEMO_MAX_ATTEMPTS:-3}"
  demo_attempt=1
  while true; do
    if python3 "$DEMO/scripts/seed_scenarios.py" --workers 1; then
      break
    fi
    if [[ "$demo_attempt" -ge "$MAX_DEMO_ATTEMPTS" ]]; then
      echo "[fail] Demo seed failed after ${MAX_DEMO_ATTEMPTS} attempt(s)" >&2
      exit 1
    fi
    demo_attempt=$((demo_attempt + 1))
    echo "[seed] Demo seed failed (attempt ${demo_attempt}/${MAX_DEMO_ATTEMPTS}) — retrying in 15s ..."
    sleep 15
  done
fi

echo ""
echo "=== Seed complete (env=${INFISICAL_ENV_NAME}) ==="
bash seed/bust-http-cache.sh || true
echo "Admin: admin@nestlancer.com / ${ADMIN_PASSWORD}"
if has_phase demo; then
  echo "Demo clients: ${CLIENT_PASSWORD}"
fi
