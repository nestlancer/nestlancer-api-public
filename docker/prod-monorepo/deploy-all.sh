#!/usr/bin/env bash
# Run once inside the monorepo-build stage to produce /deploy/<slug>/ trees.
# Parallelizes pnpm deploy (NESTLANCER_DEPLOY_PARALLEL, default 6).
#
# After each deploy we copy:
#   1) generated Prisma client
#   2) only missing runtime packages needed by bundled @nestlancer/* code
#      (Nest webpack allowlists workspace packages, so their npm deps stay external)
#
# Escape hatch (slow — old behaviour): NESTLANCER_DEPLOY_FULL_STORE_MERGE=1
set -euo pipefail

cd /app

DEPLOY_PARALLEL="${NESTLANCER_DEPLOY_PARALLEL:-6}"
# Skip Chromium downloads during deploy (PDF images install Chromium in runtime stage).
export PUPPETEER_SKIP_DOWNLOAD="${PUPPETEER_SKIP_DOWNLOAD:-true}"
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="${PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:-true}"

collect_workspace_lib_deps() {
  local pkg_json deps
  for pkg_json in /app/libs/*/package.json; do
    [ -f "$pkg_json" ] || continue
    deps="$(node -e "
      const p=require('$pkg_json');
      const d={...(p.dependencies||{}),...(p.optionalDependencies||{})};
      for (const k of Object.keys(d)) {
        if (!k.startsWith('@nestlancer/')) console.log(k);
      }
    " 2>/dev/null || true)"
    if [ -n "$deps" ]; then
      while IFS= read -r name; do
        [ -n "$name" ] && echo "$name"
      done <<<"$deps"
    fi
  done
}

link_or_copy_pkg() {
  local src="$1"
  local dest="$2"
  if [ -e "$dest" ]; then
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp -rl "$src" "$dest" 2>/dev/null || cp -a "$src" "$dest"
}

ensure_pkg_in_deploy() {
  local deploy_dir="$1"
  local pkg_name="$2"
  local src_link src_real store_entry

  if [ -e "$deploy_dir/node_modules/$pkg_name" ]; then
    return 0
  fi

  src_link="/app/node_modules/$pkg_name"
  if [ ! -e "$src_link" ]; then
    return 0
  fi

  # Prefer copying the concrete .pnpm store entry + top-level link.
  src_real="$(readlink -f "$src_link" 2>/dev/null || true)"
  if [ -n "${src_real:-}" ] && [[ "$src_real" == *"/node_modules/.pnpm/"* ]]; then
    store_entry="$(echo "$src_real" | sed -n 's#\(.*/node_modules/\.pnpm/[^/]*\).*#\1#p')"
    if [ -n "${store_entry:-}" ] && [ -d "$store_entry" ]; then
      link_or_copy_pkg "$store_entry" "$deploy_dir/node_modules/.pnpm/$(basename "$store_entry")"
    fi
  fi
  link_or_copy_pkg "$src_link" "$deploy_dir/node_modules/$pkg_name"
}

enrich_deploy_runtime_deps() {
  local deploy_dir="$1"
  local name

  mkdir -p "$deploy_dir/node_modules/.pnpm"

  if [ "${NESTLANCER_DEPLOY_FULL_STORE_MERGE:-0}" = "1" ]; then
    echo "WARN: NESTLANCER_DEPLOY_FULL_STORE_MERGE=1 — copying entire monorepo store (slow)" >&2
    local pkg
    for pkg in /app/node_modules/.pnpm/*; do
      [ -e "$pkg" ] || continue
      name="$(basename "$pkg")"
      [ -e "$deploy_dir/node_modules/.pnpm/$name" ] || link_or_copy_pkg "$pkg" "$deploy_dir/node_modules/.pnpm/$name"
    done
    for pkg in /app/node_modules/*; do
      name="$(basename "$pkg")"
      [ "$name" = ".pnpm" ] && continue
      [ -e "$deploy_dir/node_modules/$name" ] || link_or_copy_pkg "$pkg" "$deploy_dir/node_modules/$name"
    done
    return 0
  fi

  # Selective merge — O(needed packages), not O(entire store × 28 services).
  # Defaults are inlined (parallel bash -c children do not inherit parent arrays).
  local -A needed=()
  local name
  for name in amqplib ioredis redis bullmq reflect-metadata rxjs tslib; do
    needed["$name"]=1
  done
  while IFS= read -r name; do
    [ -n "$name" ] && needed["$name"]=1
  done < <(collect_workspace_lib_deps | sort -u)

  for name in "${!needed[@]}"; do
    ensure_pkg_in_deploy "$deploy_dir" "$name"
  done
}

copy_prisma_to_deploy() {
  local deploy_dir="$1"
  local src prisma_pkg deploy_mod
  src="$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -1)"
  prisma_pkg="$(find "$deploy_dir/node_modules/.pnpm" -path '*/node_modules/@prisma/client/default.js' | head -1)"
  if [ -z "${src:-}" ] || [ -z "${prisma_pkg:-}" ]; then
    echo "WARN: prisma client paths missing for $deploy_dir" >&2
  else
    deploy_mod="$(dirname "$(dirname "$(dirname "$prisma_pkg")")")"
    mkdir -p "$deploy_mod/.prisma"
    cp -r "$src" "$deploy_mod/.prisma/client"
  fi
  enrich_deploy_runtime_deps "$deploy_dir"
}

deploy_workload() {
  local filter="$1"
  local slug="$2"
  local deploy_dir="/deploy/$slug"
  echo "==> deploy $slug ($filter)"
  pnpm deploy --filter="$filter" --prod "$deploy_dir"
  # Drop volatile pnpm metadata that busts layer cache between identical deploys.
  rm -f "$deploy_dir/node_modules/.modules.yaml" \
        "$deploy_dir/node_modules/.pnpm-workspace-state-v1.json" 2>/dev/null || true
  copy_prisma_to_deploy "$deploy_dir"
  echo "==> done $slug"
}

run_pool() {
  local max="$1"
  shift
  local -a pids=()
  local cmd pid running status=0
  for cmd in "$@"; do
    while true; do
      running=0
      local -a alive=()
      for pid in "${pids[@]+"${pids[@]}"}"; do
        if kill -0 "$pid" 2>/dev/null; then
          alive+=("$pid")
          running=$((running + 1))
        else
          if ! wait "$pid"; then
            status=1
          fi
        fi
      done
      pids=("${alive[@]+"${alive[@]}"}")
      if [ "$running" -lt "$max" ]; then
        break
      fi
      sleep 0.5
    done
    bash -c "$cmd" &
    pids+=("$!")
  done
  for pid in "${pids[@]+"${pids[@]}"}"; do
    if ! wait "$pid"; then
      status=1
    fi
  done
  return "$status"
}

mkdir -p /deploy

export -f collect_workspace_lib_deps link_or_copy_pkg ensure_pkg_in_deploy
export -f enrich_deploy_runtime_deps copy_prisma_to_deploy deploy_workload
export PUPPETEER_SKIP_DOWNLOAD PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
export NESTLANCER_DEPLOY_FULL_STORE_MERGE="${NESTLANCER_DEPLOY_FULL_STORE_MERGE:-0}"

cmds=()
cmds+=("deploy_workload ./gateway gateway")
cmds+=("deploy_workload ./ws-gateway ws-gateway")

for s in auth users payments webhooks admin requests quotes projects progress messaging notifications media portfolio blog contact health; do
  cmds+=("deploy_workload ./services/$s $s")
done

for w in analytics-worker audit-worker cdn-worker email-worker media-worker notification-worker outbox-poller webhook-worker document-worker export-worker; do
  cmds+=("deploy_workload ./workers/$w $w")
done

deploy_slug() {
  local slug="$1"
  case "$slug" in
    gateway) deploy_workload ./gateway gateway ;;
    ws-gateway) deploy_workload ./ws-gateway ws-gateway ;;
    auth|users|payments|webhooks|admin|requests|quotes|projects|progress|messaging|notifications|media|portfolio|blog|contact|health)
      deploy_workload "./services/${slug}" "$slug"
      ;;
    analytics-worker|audit-worker|cdn-worker|email-worker|media-worker|notification-worker|outbox-poller|webhook-worker|document-worker|export-worker)
      deploy_workload "./workers/${slug}" "$slug"
      ;;
    *)
      echo "ERROR: unknown deploy slug=${slug}" >&2
      return 1
      ;;
  esac
}

export -f deploy_slug

if [ -n "${NESTLANCER_BUILD_TARGETS:-}" ]; then
  IFS=',' read -ra target_slugs <<< "$NESTLANCER_BUILD_TARGETS"
  echo "==> Deploying ${#target_slugs[@]} workload(s) (${NESTLANCER_BUILD_TARGETS})..."
  deploy_cmds=()
  for slug in "${target_slugs[@]}"; do
    deploy_cmds+=("deploy_slug ${slug}")
  done
  run_pool "$DEPLOY_PARALLEL" "${deploy_cmds[@]}"
elif [ -n "${NESTLANCER_BUILD_TARGET:-}" ]; then
  echo "==> Deploying 1 workload (${NESTLANCER_BUILD_TARGET})..."
  deploy_slug "$NESTLANCER_BUILD_TARGET"
else
  echo "==> Deploying ${#cmds[@]} workloads (parallel=${DEPLOY_PARALLEL}, selective runtime deps)..."
  run_pool "$DEPLOY_PARALLEL" "${cmds[@]}"
fi

echo "All workloads deployed under /deploy"
