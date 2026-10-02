#!/usr/bin/env bash
# Run docker compose for the dev stack with secrets from Infisical.
# Exports to .env.infisical (gitignored) before commands that start containers.
#
# Bring-up modes (8-core / 24GB VPS — containers start in batches):
#   NESTLANCER_UP_MODE=core     → all gateways + all microservices + promtail (+ Caddy)
#   NESTLANCER_UP_MODE=workers  → workers only (needs COMPOSE_PROFILES=workers)
#   NESTLANCER_UP_MODE=full     → core then workers (batched)
#
# Tear-down modes:
#   NESTLANCER_DOWN_MODE=core     → stop/remove core (+ Caddy); leave workers running
#   NESTLANCER_DOWN_MODE=workers  → stop/remove workers only; leave core running
#   NESTLANCER_DOWN_MODE=full     → stop everything (default for bare `down`)
#
# Default: WATCH_SERVICES=all-services — gateways + all microservices watch;
# workers stay compiled. Override with a comma list for focused watch.
#
# Examples:
#   NESTLANCER_UP_MODE=core bash scripts/docker/compose-dev.sh up -d
#   NESTLANCER_UP_MODE=workers COMPOSE_PROFILES=workers bash scripts/docker/compose-dev.sh up -d
#   NESTLANCER_DOWN_MODE=workers bash scripts/docker/compose-dev.sh down
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BASE_COMPOSE_FILE="docker-compose.dev.yml"
LOCAL_COMPOSE_FILE="docker-compose.local.yml"
INFISICAL_ENV="${INFISICAL_ENV:-dev}"
ENV_FILE="${INFISICAL_ENV_FILE:-.env.infisical}"
DEV_IMAGE="${NESTLANCER_DEV_IMAGE:-nestlancer-backend-dev:latest}"
export WATCH_SERVICES="${WATCH_SERVICES:-all-services}"

# Services started per batch. Four concurrent Nest webpack builds fit 8 cores
# without the compile pile-up seen at batch=8 under WATCH_SERVICES=all-services.
UP_BATCH_SIZE="${NESTLANCER_UP_BATCH_SIZE:-4}"
# Recreate selected containers even when Compose configuration is unchanged.
# Worker deploy mode enables this so source freshness checks run on every deploy.
UP_FORCE_RECREATE="${NESTLANCER_FORCE_RECREATE:-0}"
# Settle delay between batches (seconds).
UP_DELAY_SEC="${NESTLANCER_UP_DELAY_SEC:-8}"
# Max seconds to wait for Nest build+boot ready before starting the next service.
READY_TIMEOUT_SEC="${NESTLANCER_READY_TIMEOUT_SEC:-240}"
# Abort batched up if MemAvailable drops below this (kB). Default ~2GB.
MEM_ABORT_KB="${NESTLANCER_MEM_ABORT_KB:-2000000}"
# Prefer waiting until MemAvailable recovers above this before next Nest build (kB).
MEM_RESUME_KB="${NESTLANCER_MEM_RESUME_KB:-2200000}"

CORE_SERVICES=(
  promtail
  gateway
  ws-gateway
  svc-health
  svc-auth
  svc-users
  svc-payments
  svc-requests
  svc-quotes
  svc-projects
  svc-progress
  svc-messaging
  svc-notifications
  svc-webhooks
  svc-admin
  svc-media
  svc-portfolio
  svc-blog
  svc-contact
)

WORKER_SERVICES=(
  worker-outbox
  worker-email
  worker-notification
  worker-webhook
  worker-media
  worker-cdn
  worker-analytics
  worker-audit
  worker-document
  worker-export
)

sanitize_env_file() {
  local f="$1"
  # Infisical dotenv quotes break RATE_LIMIT_ENABLED / AUTH_IP_FAIL_* in containers.
  if [ -f "$f" ]; then
    bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sanitize-infisical-env.sh" "$f"
  fi
}

export_dev_env() {
  if ! command -v infisical >/dev/null 2>&1; then
    echo "ERROR: infisical CLI not found. Install: https://infisical.com/docs/cli/overview" >&2
    exit 1
  fi

  if [ -z "${INFISICAL_TOKEN:-}" ]; then
    if [ -n "${INFISICAL_CLIENT_ID:-}" ] && [ -n "${INFISICAL_CLIENT_SECRET:-}" ]; then
      INFISICAL_TOKEN="$(infisical login \
        --method=universal-auth \
        --client-id="$INFISICAL_CLIENT_ID" \
        --client-secret="$INFISICAL_CLIENT_SECRET" \
        --silent --plain)"
      export INFISICAL_TOKEN
    elif ! infisical user get >/dev/null 2>&1; then
      echo "ERROR: Not logged in to Infisical. Run: infisical login" >&2
      echo "       Or set INFISICAL_TOKEN / INFISICAL_CLIENT_ID+SECRET (machine identity)." >&2
      exit 1
    fi
  fi

  local project_id="${INFISICAL_PROJECT_ID:-}"
  if [ -z "$project_id" ] && [ -f .infisical.json ]; then
    project_id="$(node -p "JSON.parse(require('fs').readFileSync('.infisical.json','utf8')).workspaceId")"
  fi
  if [ -n "$project_id" ]; then
    infisical export --env="$INFISICAL_ENV" --format=dotenv --projectId="$project_id" >"$ENV_FILE"
  else
    infisical export --env="$INFISICAL_ENV" --format=dotenv >"$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
  sanitize_env_file "$ENV_FILE"
}

needs_env_file() {
  case "${1:-}" in
    up|start|restart|run|create)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

mem_available_kb() {
  awk '/MemAvailable:/ {print $2}' /proc/meminfo
}

# Abort before container stampede can thrash swap / kill SSH on small hosts.
ssh_safe_preflight() {
  local cmd="${1:-}"
  case "$cmd" in
    up|start|create) ;;
    *) return 0 ;;
  esac

  local mem_kb avail_kb profiles mode
  mem_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo)"
  avail_kb="$(mem_available_kb)"
  profiles="${COMPOSE_PROFILES:-}"
  mode="${NESTLANCER_UP_MODE:-}"

  # Absolute floor — do not start anything if the host is already starving.
  if [ "${avail_kb}" -lt 1500000 ]; then
    echo "ERROR: MemAvailable is ${avail_kb} kB (<~1.5GB). Refusing '${cmd}' to protect SSH." >&2
    echo "       Free memory or: docker compose down / reboot, then retry." >&2
    exit 1
  fi

  # Full worker profile needs a 20GB+ host unless explicitly overridden.
  if [[ ",${profiles}," == *",full,"* ]] || [[ "${profiles}" == "full" ]]; then
    if [ "${mem_kb}" -lt 20000000 ] && [ "${NESTLANCER_ALLOW_FULL:-0}" != "1" ]; then
      echo "ERROR: COMPOSE_PROFILES=full is blocked on <20GB hosts (SSH lockout risk)." >&2
      echo "       Safe path:" >&2
      echo "         1) pnpm docker:up                 # all microservices watch, batched" >&2
      echo "         2) verify SSH + free -h (MemAvailable ≥~2GB)" >&2
      echo "         3) pnpm docker:up:workers         # workers batched" >&2
      echo "       Or: pnpm docker:up:full  (NESTLANCER_UP_MODE=full, batched hybrid)" >&2
      exit 1
    fi
  fi

  if [[ "${mode}" == "workers" || "${mode}" == "full" || "${profiles}" == *workers* ]] \
    && [ "${avail_kb}" -lt 3000000 ]; then
    echo "WARN: MemAvailable ${avail_kb} kB is low before starting workers. Keep provider console open." >&2
  fi

  echo "SSH-safe preflight: MemTotal=${mem_kb}kB MemAvailable=${avail_kb}kB MODE='${mode:-<passthrough>}' COMPOSE_PROFILES='${profiles:-<none>}' WATCH_SERVICES='${WATCH_SERVICES}'"
}

ensure_dev_image() {
  if docker image inspect "$DEV_IMAGE" >/dev/null 2>&1; then
    return 0
  fi
  echo "Local image ${DEV_IMAGE} missing — building once (single target, not bake-all)..."
  docker build -f docker/dev.Dockerfile -t "$DEV_IMAGE" "$ROOT"
}

# Shared named volumes must be populated by ONE container. Parallel `up` create races
# on pnpm symlink trees → "failed to create symlink ... file exists".
prewarm_shared_volumes() {
  local -a cf=("$@")
  echo "Pre-warming shared node_modules volumes (single container)..."
  if docker compose "${cf[@]}" run --rm --no-deps --entrypoint true gateway >/dev/null; then
    return 0
  fi

  echo "WARN: volume pre-warm failed — recreating shared nl_nm_* / nl_prisma_* volumes..." >&2
  docker compose "${cf[@]}" down --remove-orphans >/dev/null 2>&1 || true
  docker volume ls -q | grep -E '_nl_nm_|_nl_prisma_' | while read -r vol; do
    docker volume rm "$vol" >/dev/null 2>&1 || true
  done
  docker compose "${cf[@]}" run --rm --no-deps --entrypoint true gateway >/dev/null
}

args_have_flag() {
  local flag="$1"
  shift
  local a
  for a in "$@"; do
    if [ "$a" = "$flag" ]; then
      return 0
    fi
  done
  return 1
}

# Collect non-flag positional service names from compose up args.
collect_explicit_services() {
  local -a out=()
  local a skip_next=0
  for a in "$@"; do
    if [ "$skip_next" = "1" ]; then
      skip_next=0
      continue
    fi
    case "$a" in
      -d|--detach|--no-build|--build|--remove-orphans|--force-recreate|--no-recreate|--no-deps|--wait|--wait-timeout|--pull|--quiet-pull|--renew-anon-volumes|--always-recreate-deps|--no-color|--verbose|--abort-on-container-exit|--abort-on-container-failure)
        continue
        ;;
      --scale|--pull|--wait-timeout|-t|--timeout)
        skip_next=1
        continue
        ;;
      -*)
        continue
        ;;
      *)
        out+=("$a")
        ;;
    esac
  done
  # Print nothing when empty — bare `printf '%s\n'` emits a blank line and
  # would be mistaken for an explicit service name.
  if [ "${#out[@]}" -gt 0 ]; then
    printf '%s\n' "${out[@]}"
  fi
}

check_mem_or_abort() {
  local next_svc="$1"
  local avail_kb
  avail_kb="$(mem_available_kb)"
  if [ "${avail_kb}" -lt "${MEM_ABORT_KB}" ]; then
    echo "ERROR: MemAvailable ${avail_kb}kB < abort floor ${MEM_ABORT_KB}kB — stopping before '${next_svc}' to protect SSH." >&2
    echo "       Started containers were left running. Check: free -h; docker compose ps" >&2
    exit 1
  fi
  echo "  MemAvailable=${avail_kb}kB (abort <${MEM_ABORT_KB}kB)"
}

wait_container_running() {
  local -a cf=("${@:1:$#-1}")
  local svc="${!#}"
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if docker compose "${cf[@]}" ps --status running -q "$svc" 2>/dev/null | grep -q .; then
      return 0
    fi
    sleep 1
  done
  echo "WARN: ${svc} not in running state yet — check logs: docker compose logs --tail=80 ${svc}" >&2
  return 0
}

running_container_id() {
  local -a cf=("${@:1:$#-1}")
  local svc="${!#}"
  docker compose "${cf[@]}" ps --status running -q "$svc" 2>/dev/null || true
}

wait_batch_memory_resume() {
  local elapsed=0 avail_kb
  while [ "$elapsed" -lt 90 ]; do
    avail_kb="$(mem_available_kb)"
    if [ "$avail_kb" -ge "$MEM_RESUME_KB" ]; then
      echo "  batch MemAvailable=${avail_kb}kB ≥ resume ${MEM_RESUME_KB}kB"
      return 0
    fi
    echo "  waiting for batch MemAvailable≥${MEM_RESUME_KB}kB (now ${avail_kb}kB)..."
    sleep 5
    elapsed=$((elapsed + 5))
  done
}

# Wait until Nest finished build+boot (or sidecar is up).
wait_service_boot() {
  local -a cf=("${@:1:$#-1}")
  local svc="${!#}"
  local cid elapsed=0

  # Sidecars / proxy: short settle only
  case "$svc" in
    promtail|dev-proxy)
      sleep 2
      return 0
      ;;
  esac

  cid="$(docker compose "${cf[@]}" ps -q "$svc" 2>/dev/null || true)"
  echo "  waiting up to ${READY_TIMEOUT_SEC}s for ${svc} ready (build/boot)..."
  while [ "$elapsed" -lt "$READY_TIMEOUT_SEC" ]; do
    if [ -n "$cid" ]; then
      # Accept actual Nest/webpack/worker readiness, not merely command startup.
      # External deps (Redis/etc.) may prevent full "successfully started".
      if docker logs "$cid" 2>&1 | tail -n 200 | grep -Eiq \
        'Nest application successfully started|successfully started|Listening on|Server running|webpack .*compiled|compiled successfully|Worker is running|Worker is running\.\.\.|Poller Worker is running'; then
        echo "  ${svc}: ready signal (${elapsed}s)"
        return 0
      fi
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    cid="$(docker compose "${cf[@]}" ps -q "$svc" 2>/dev/null || true)"
  done
  echo "WARN: ${svc} ready timeout after ${READY_TIMEOUT_SEC}s — continuing (check logs)" >&2
}

batched_up_services() {
  local -a cf=()
  local -a services=()
  local seen_sep=0
  local a
  for a in "$@"; do
    if [ "$a" = "--" ]; then
      seen_sep=1
      continue
    fi
    if [ "$seen_sep" = "0" ]; then
      cf+=("$a")
    else
      services+=("$a")
    fi
  done

  local svc cid start display_start end total
  local -a batch=()
  local -a started=()
  local -a up_args=()
  local -A previous_ids=()
  total="${#services[@]}"
  for ((start = 0; start < total; start += UP_BATCH_SIZE)); do
    batch=("${services[@]:start:UP_BATCH_SIZE}")
    started=()
    display_start=$((start + 1))
    end=$((start + ${#batch[@]}))
    echo ""
    echo "─── [${display_start}-${end}/${total}] starting batch: ${batch[*]} ───"
    check_mem_or_abort "${batch[*]}"
    # Compose leaves unchanged running containers alone. Remember their IDs so
    # readiness polling does not wait for a new log line that will never exist.
    for svc in "${batch[@]}"; do
      previous_ids["$svc"]="$(running_container_id "${cf[@]}" "$svc")"
    done
    up_args=(-d --no-build --no-deps)
    if [ "$UP_FORCE_RECREATE" = "1" ]; then
      up_args+=(--force-recreate)
    fi
    docker compose "${cf[@]}" up "${up_args[@]}" "${batch[@]}"
    for svc in "${batch[@]}"; do
      wait_container_running "${cf[@]}" "$svc"
    done
    for svc in "${batch[@]}"; do
      cid="$(running_container_id "${cf[@]}" "$svc")"
      if [ -n "${previous_ids[$svc]}" ] && [ "${previous_ids[$svc]}" = "$cid" ]; then
        echo "  ${svc}: already running unchanged — skip readiness wait"
      else
        started+=("$svc")
      fi
    done
    for svc in "${started[@]}"; do
      wait_service_boot "${cf[@]}" "$svc" &
    done
    if [ "${#started[@]}" -gt 0 ]; then
      wait
      wait_batch_memory_resume
    fi
    if [ "${#started[@]}" -gt 0 ] && [ "$end" -lt "$total" ]; then
      echo "  settling ${UP_DELAY_SEC}s before next batch..."
      sleep "$UP_DELAY_SEC"
    fi
  done
}

print_bringup_summary() {
  local -a cf=("$@")
  echo ""
  echo "═══ Bring-up summary ═══"
  docker compose "${cf[@]}" ps
  echo ""
  free -h
  echo ""
  echo "WATCH_SERVICES=${WATCH_SERVICES}"
  echo "Tip: focused fallback: WATCH_SERVICES=gateway,svc-auth pnpm docker:up"
}

# Stop + remove selected services without tearing down the whole project/network
# (so core-down can leave workers up, and workers-down can leave core up).
selective_down_services() {
  local -a cf=()
  local -a services=()
  local seen_sep=0
  local a
  for a in "$@"; do
    if [ "$a" = "--" ]; then
      seen_sep=1
      continue
    fi
    if [ "$seen_sep" = "0" ]; then
      cf+=("$a")
    else
      services+=("$a")
    fi
  done

  if [ "${#services[@]}" -eq 0 ]; then
    echo "WARN: no services to stop" >&2
    return 0
  fi

  echo "Stopping: ${services[*]}"
  # ignore missing/already-stopped containers
  docker compose "${cf[@]}" stop "${services[@]}" 2>/dev/null || true
  docker compose "${cf[@]}" rm -f "${services[@]}" 2>/dev/null || true
}

if [ $# -eq 0 ]; then
  echo "Usage: $0 <docker compose args...>" >&2
  echo "Example: NESTLANCER_UP_MODE=core $0 up -d" >&2
  exit 1
fi

CMD="$1"
shift
ARGS=("$@")

# Workers live behind compose profile `workers`. Without it, `logs`/`ps`/etc.
# only see core services — worker containers are invisible in combined logs.
# Enable the profile for observational/lifecycle commands (does NOT start workers).
# Leave `up` alone so `pnpm docker:up` stays core-only unless MODE/profiles set.
# For `down`, profile handling is decided by NESTLANCER_DOWN_MODE below.
case "$CMD" in
  logs|ps|top|events|restart|stop|kill|pause|unpause|rm|port|images)
    if [[ ",${COMPOSE_PROFILES:-}," != *",workers,"* ]] && [[ "${COMPOSE_PROFILES:-}" != "workers" ]]; then
      if [ -n "${COMPOSE_PROFILES:-}" ]; then
        export COMPOSE_PROFILES="${COMPOSE_PROFILES},workers"
      else
        export COMPOSE_PROFILES=workers
      fi
    fi
    ;;
esac

if needs_env_file "$CMD"; then
  export_dev_env
  ssh_safe_preflight "$CMD"
fi

compose_files=(-f "$BASE_COMPOSE_FILE")
if [ "${ENABLE_LOCAL_PROXY:-1}" = "1" ]; then
  compose_files+=(-f "$LOCAL_COMPOSE_FILE")
fi

# Single shared image: avoid parallel builds and unnecessary memory/IO spikes.
if [ "$CMD" = "build" ]; then
  echo "Building shared image ${DEV_IMAGE} (single target)..."
  exec docker build -f docker/dev.Dockerfile -t "$DEV_IMAGE" "${ARGS[@]}" "$ROOT"
fi

# Selective / full tear-down
if [ "$CMD" = "down" ]; then
  down_mode="${NESTLANCER_DOWN_MODE:-full}"
  case "$down_mode" in
    core)
      echo "Stopping CORE services only (workers left running if any)..."
      targets=("${CORE_SERVICES[@]}")
      if [ "${ENABLE_LOCAL_PROXY:-1}" = "1" ]; then
        targets+=(dev-proxy)
      fi
      selective_down_services "${compose_files[@]}" -- "${targets[@]}"
      echo ""
      docker compose "${compose_files[@]}" ps
      exit 0
      ;;
    workers)
      export COMPOSE_PROFILES="${COMPOSE_PROFILES:-workers}"
      if [[ ",${COMPOSE_PROFILES}," != *",workers,"* ]]; then
        export COMPOSE_PROFILES=workers
      fi
      echo "Stopping WORKERS only (core left running if any)..."
      selective_down_services "${compose_files[@]}" -- "${WORKER_SERVICES[@]}"
      echo ""
      docker compose "${compose_files[@]}" ps
      exit 0
      ;;
    full|all)
      export COMPOSE_PROFILES="${COMPOSE_PROFILES:-workers}"
      if [[ ",${COMPOSE_PROFILES}," != *",workers,"* ]]; then
        export COMPOSE_PROFILES=workers
      fi
      echo "Stopping FULL stack (core + workers)..."
      exec docker compose "${compose_files[@]}" down --remove-orphans "${ARGS[@]+"${ARGS[@]}"}"
      ;;
    *)
      echo "ERROR: unknown NESTLANCER_DOWN_MODE='${down_mode}' (expected core|workers|full)" >&2
      exit 1
      ;;
  esac
fi

# For bring-up: ensure image locally, pre-warm volumes once, never re-build via bake.
if [ "$CMD" = "up" ] || [ "$CMD" = "create" ]; then
  ensure_dev_image
  prewarm_shared_volumes "${compose_files[@]}"
  if ! args_have_flag --no-build "${ARGS[@]+"${ARGS[@]}"}"; then
    ARGS+=(--no-build)
  fi
elif [ "$CMD" = "start" ]; then
  ensure_dev_image
fi

# Batched bring-up when MODE is set (or default core for bare `up -d`).
if [ "$CMD" = "up" ]; then
  mode="${NESTLANCER_UP_MODE:-}"
  explicit=()
  while IFS= read -r _svc; do
    [ -n "$_svc" ] && explicit+=("$_svc")
  done < <(collect_explicit_services "${ARGS[@]+"${ARGS[@]}"}")

  # If caller named specific services, start those one-by-one (ignore MODE lists).
  if [ "${#explicit[@]}" -gt 0 ]; then
    echo "Batched up of explicit services: ${explicit[*]}"
    batched_up_services "${compose_files[@]}" -- "${explicit[@]}"
    print_bringup_summary "${compose_files[@]}"
    exit 0
  fi

  # Bare `up -d` without MODE → treat as core (Option A default).
  if [ -z "$mode" ]; then
    mode="core"
  fi

  case "$mode" in
    core)
      echo "Batched CORE up (${#CORE_SERVICES[@]} services, batch=${UP_BATCH_SIZE}, delay=${UP_DELAY_SEC}s)..."
      batched_up_services "${compose_files[@]}" -- "${CORE_SERVICES[@]}"
      if [ "${ENABLE_LOCAL_PROXY:-1}" = "1" ]; then
        echo ""
        echo "─── starting dev-proxy (Caddy) last ───"
        check_mem_or_abort "dev-proxy"
        docker compose "${compose_files[@]}" up -d --no-build --no-deps dev-proxy
      fi
      print_bringup_summary "${compose_files[@]}"
      exit 0
      ;;
    workers)
      if [[ ",${COMPOSE_PROFILES:-}," != *",workers,"* ]] && [[ "${COMPOSE_PROFILES:-}" != "workers" ]]; then
        echo "WARN: NESTLANCER_UP_MODE=workers without COMPOSE_PROFILES=workers — exporting COMPOSE_PROFILES=workers" >&2
        export COMPOSE_PROFILES=workers
      fi
      if ! docker compose "${compose_files[@]}" ps --status running -q gateway 2>/dev/null | grep -q .; then
        echo "WARN: gateway not running — prefer pnpm docker:up first, then workers." >&2
      fi
      # Workers are intentionally non-watch. Recreate them so the runner checks
      # source mtimes, rebuilds changed packages, and deploys fresh dist output.
      UP_FORCE_RECREATE=1
      echo "Batched WORKERS up (${#WORKER_SERVICES[@]} services, batch=${UP_BATCH_SIZE}, delay=${UP_DELAY_SEC}s)..."
      batched_up_services "${compose_files[@]}" -- "${WORKER_SERVICES[@]}"
      print_bringup_summary "${compose_files[@]}"
      exit 0
      ;;
    full)
      export COMPOSE_PROFILES="${COMPOSE_PROFILES:-workers}"
      if [[ ",${COMPOSE_PROFILES}," != *",workers,"* ]]; then
        export COMPOSE_PROFILES="workers"
      fi
      echo "Batched FULL up = core then workers..."
      UP_FORCE_RECREATE=0
      batched_up_services "${compose_files[@]}" -- "${CORE_SERVICES[@]}"
      if [ "${ENABLE_LOCAL_PROXY:-1}" = "1" ]; then
        check_mem_or_abort "dev-proxy"
        docker compose "${compose_files[@]}" up -d --no-build --no-deps dev-proxy
      fi
      UP_FORCE_RECREATE=1
      batched_up_services "${compose_files[@]}" -- "${WORKER_SERVICES[@]}"
      print_bringup_summary "${compose_files[@]}"
      exit 0
      ;;
    *)
      echo "ERROR: unknown NESTLANCER_UP_MODE='${mode}' (expected core|workers|full)" >&2
      exit 1
      ;;
  esac
fi

exec docker compose "${compose_files[@]}" "$CMD" "${ARGS[@]+"${ARGS[@]}"}"
