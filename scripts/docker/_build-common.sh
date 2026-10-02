#!/usr/bin/env bash
# Shared Docker build helpers for production image scripts.
# Durable local BuildKit cache (mode=max) + docker-container builder for resume-after-interrupt.

set -euo pipefail

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

NESTLANCER_BUILD_PARALLEL="${NESTLANCER_BUILD_PARALLEL:-4}"
MONOREPO_DOCKERFILE="${NESTLANCER_MONOREPO_DOCKERFILE:-docker/prod-monorepo/Dockerfile}"
BAKE_FILE="${NESTLANCER_BAKE_FILE:-docker/prod-monorepo/docker-bake.hcl}"
NESTLANCER_BUILD_CACHE="${NESTLANCER_BUILD_CACHE:-${ROOT:-.}/.cache/docker-buildkit}"
NESTLANCER_BUILDX_BUILDER="${NESTLANCER_BUILDX_BUILDER:-nestlancer}"

# Live timer / progress bar / ETA
# shellcheck source=scripts/docker/_progress.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_progress.sh"

ensure_build_cache() {
  mkdir -p "$NESTLANCER_BUILD_CACHE"
}

ensure_buildx_builder() {
  local name="$NESTLANCER_BUILDX_BUILDER"
  if ! docker buildx inspect "$name" >/dev/null 2>&1; then
    echo "==> Creating buildx builder '${name}' (driver=docker-container)"
    docker buildx create --name "$name" --driver docker-container --driver-opt network=host >/dev/null
  fi
  docker buildx use "$name" >/dev/null
  docker buildx inspect --bootstrap "$name" >/dev/null 2>&1 || true
}

nestlancer_cache_dir_abs() {
  ensure_build_cache
  local dir="$NESTLANCER_BUILD_CACHE"
  if [[ "$dir" != /* ]]; then
    dir="${ROOT:-.}/${dir}"
  fi
  mkdir -p "$dir"
  (cd "$dir" && pwd)
}

append_local_cache_args() {
  local -n _bake_args=$1
  local cache_dir
  cache_dir="$(nestlancer_cache_dir_abs)"
  if [ "${NESTLANCER_DISABLE_LOCAL_CACHE:-0}" = "1" ]; then
    return 0
  fi
  _bake_args+=(--set "*.cache-from=type=local,src=${cache_dir}")
  if [ "${NESTLANCER_CACHE_EXPORT:-1}" = "1" ]; then
    _bake_args+=(--set "*.cache-to=type=local,dest=${cache_dir},mode=max,ignore-error=true")
  else
    _bake_args+=(--set "*.cache-to=")
  fi
}

resolve_build_filter() {
  local target="$1"
  case "$target" in
    gateway | ws-gateway) echo "./${target}..." ;;
    analytics-worker | audit-worker | cdn-worker | email-worker | media-worker | notification-worker | outbox-poller | webhook-worker | document-worker | export-worker)
      echo "./workers/${target}..."
      ;;
    *)
      echo "./services/${target}..."
      ;;
  esac
}

run_parallel() {
  local max="$1"
  shift
  for cmd in "$@"; do
    while [ "$(jobs -rp | wc -l)" -ge "$max" ]; do
      wait -n 2>/dev/null || wait || true
    done
    bash -c "$cmd" &
  done
  wait
}

prune_dangling_images() {
  docker image prune -f >/dev/null 2>&1 || true
}

_bake_runtime_targets_inner() {
  local -a targets=("$@")
  ensure_buildx_builder
  ensure_build_cache

  local -a bake_args=(
    -f "$BAKE_FILE"
    --builder "$NESTLANCER_BUILDX_BUILDER"
    --set "*.context=${ROOT}"
    --allow "fs.read=${ROOT}"
  )

  append_local_cache_args bake_args

  local output_mode="${NESTLANCER_BAKE_OUTPUT:-load}"
  case "$output_mode" in
    load) bake_args+=(--load) ;;
    push) bake_args+=(--push) ;;
    cacheonly) bake_args+=(--set "*.output=type=cacheonly") ;;
    none) ;;
    *)
      echo "Unknown NESTLANCER_BAKE_OUTPUT=${output_mode} (use load|push|cacheonly|none)" >&2
      return 1
      ;;
  esac

  if [ -n "${NESTLANCER_BUILD_TARGETS:-}" ]; then
    bake_args+=(--set "*.args.NESTLANCER_BUILD_TARGETS=${NESTLANCER_BUILD_TARGETS}")
  fi
  if [ -n "${NESTLANCER_BUILD_TARGET:-}" ]; then
    bake_args+=(--set "*.args.NESTLANCER_BUILD_TARGET=${NESTLANCER_BUILD_TARGET}")
  fi

  echo "==> bake [${output_mode}] targets: ${targets[*]}"
  echo "==> cache: $(nestlancer_cache_dir_abs)"

  REGISTRY="${REGISTRY:-ghcr.io/nestlancer}" \
  TAG="${TAG:-latest}" \
  CACHE_DIR="$(nestlancer_cache_dir_abs)" \
    docker buildx bake "${bake_args[@]}" "${targets[@]}"

  if [ "$output_mode" = "load" ] || [ "$output_mode" = "push" ]; then
    prune_dangling_images
  fi
}

bake_runtime_targets() {
  local -a targets=("$@")
  local label="${NESTLANCER_PROGRESS_LABEL:-bake ${targets[*]}}"
  local timing_key="${NESTLANCER_PROGRESS_TIMING_KEY:-backend.${targets[0]}}"
  local eta default_eta=600

  case "${targets[0]}" in
    monorepo-builder | monorepo-deps | monorepo-compile | checkpoints) default_eta=900 ;;
    gateways) default_eta=300 ;;
    services) default_eta=600 ;;
    workers) default_eta=480 ;;
    all-runtime) default_eta=1200 ;;
    *) default_eta=480 ;;
  esac
  eta="$(nl_progress_load_timing "$timing_key" "$default_eta")"

  # Nested under an active phased job: reuse parent phase timer.
  if [ "${NL_PROGRESS_ACTIVE_PHASE:-0}" = "1" ]; then
    nl_progress_run _bake_runtime_targets_inner "${targets[@]}"
    return $?
  fi

  nl_progress_job_start "$label" "$eta"
  nl_progress_phase_start 1 1 "$label" 0 100 "$eta"
  local rc=0
  nl_progress_run _bake_runtime_targets_inner "${targets[@]}" || rc=$?
  nl_progress_phase_end "$timing_key"
  nl_progress_job_end
  return "$rc"
}

resolve_group_deploy_targets() {
  case "$1" in
    gateways) echo "gateway,ws-gateway" ;;
    services)
      echo "auth,users,payments,webhooks,admin,requests,quotes,projects,progress,messaging,notifications,media,portfolio,blog,contact,health"
      ;;
    workers)
      echo "analytics-worker,audit-worker,cdn-worker,email-worker,media-worker,notification-worker,outbox-poller,webhook-worker,document-worker,export-worker"
      ;;
    *) echo "" ;;
  esac
}

bake_monorepo_checkpoint() {
  local checkpoint="${1:-monorepo-builder}"
  unset NESTLANCER_BUILD_TARGET NESTLANCER_BUILD_TARGETS || true
  NESTLANCER_BAKE_OUTPUT=cacheonly bake_runtime_targets "$checkpoint"
}

bake_all_runtime_phased() {
  local runtime_output="${NESTLANCER_BAKE_OUTPUT:-load}"
  if [ "$runtime_output" = "cacheonly" ]; then
    runtime_output=load
  fi

  local eta1 eta2 eta3 eta4 job_eta
  eta1="$(nl_progress_load_timing backend.monorepo-builder 900)"
  eta2="$(nl_progress_load_timing backend.gateways 300)"
  eta3="$(nl_progress_load_timing backend.services 600)"
  eta4="$(nl_progress_load_timing backend.workers 480)"
  job_eta=$((eta1 + eta2 + eta3 + eta4))

  nl_progress_job_start "backend all-runtime (phased)" "$job_eta"

  nl_progress_phase_start 1 4 "monorepo-builder checkpoint" 0 45 "$eta1"
  NESTLANCER_CACHE_EXPORT=1 \
  NESTLANCER_PROGRESS_TIMING_KEY=backend.monorepo-builder \
    bake_monorepo_checkpoint monorepo-builder
  nl_progress_phase_end backend.monorepo-builder

  nl_progress_phase_start 2 4 "gateways" 45 60 "$eta2"
  NESTLANCER_BUILD_TARGETS="$(resolve_group_deploy_targets gateways)" \
  NESTLANCER_CACHE_EXPORT=0 NESTLANCER_BAKE_OUTPUT="$runtime_output" \
  NESTLANCER_PROGRESS_TIMING_KEY=backend.gateways \
    bake_runtime_targets gateways
  nl_progress_phase_end backend.gateways

  nl_progress_phase_start 3 4 "services" 60 85 "$eta3"
  NESTLANCER_BUILD_TARGETS="$(resolve_group_deploy_targets services)" \
  NESTLANCER_CACHE_EXPORT=0 NESTLANCER_BAKE_OUTPUT="$runtime_output" \
  NESTLANCER_PROGRESS_TIMING_KEY=backend.services \
    bake_runtime_targets services
  nl_progress_phase_end backend.services

  nl_progress_phase_start 4 4 "workers" 85 100 "$eta4"
  NESTLANCER_BUILD_TARGETS="$(resolve_group_deploy_targets workers)" \
  NESTLANCER_CACHE_EXPORT=0 NESTLANCER_BAKE_OUTPUT="$runtime_output" \
  NESTLANCER_PROGRESS_TIMING_KEY=backend.workers \
    bake_runtime_targets workers
  nl_progress_phase_end backend.workers

  nl_progress_job_end
}

build_monorepo_target() {
  local target="$1"
  local image_ref="$2"

  # One-image builds keep layers in the buildx builder; skip slow local mode=max export.
  NESTLANCER_PROGRESS_LABEL="backend ${target}" \
  NESTLANCER_PROGRESS_TIMING_KEY="backend.${target}" \
  NESTLANCER_BUILD_TARGET="$target" \
  NESTLANCER_CACHE_EXPORT="${NESTLANCER_CACHE_EXPORT:-0}" \
    bake_runtime_targets "$target"
  docker tag "${REGISTRY:-ghcr.io/nestlancer}/${target}:${TAG:-latest}" "$image_ref" 2>/dev/null || true
  echo "Built $image_ref"
}
