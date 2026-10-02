#!/usr/bin/env bash
# Live build progress: elapsed timer, ETA, and progress bar for Docker bake scripts.
#
# Disable: NESTLANCER_PROGRESS=0
# Narrow bar: NESTLANCER_PROGRESS_WIDTH=20 (default 28)

# shellcheck disable=SC2034

NL_PROGRESS_ENABLED="${NESTLANCER_PROGRESS:-1}"
NL_PROGRESS_WIDTH="${NESTLANCER_PROGRESS_WIDTH:-28}"
NL_PROGRESS_JOB_START=0
NL_PROGRESS_PHASE_START=0
NL_PROGRESS_PHASE=0
NL_PROGRESS_PHASES=1
NL_PROGRESS_LABEL=""
NL_PROGRESS_PCT_START=0
NL_PROGRESS_PCT_END=100
NL_PROGRESS_PHASE_ETA=0
NL_PROGRESS_JOB_ETA=0
NL_PROGRESS_TIMER_PID=""
NL_PROGRESS_LOCK=""
NL_PROGRESS_TTY=""
NL_PROGRESS_TIMINGS_FILE=""
NL_PROGRESS_ACTIVE_PHASE=0

nl_progress_available() {
  [ "${NL_PROGRESS_ENABLED}" = "1" ] || return 1
  # Probe /dev/tty — "-w" alone is not enough in some sandboxes.
  if { : >/dev/tty; } 2>/dev/null; then
    NL_PROGRESS_TTY="/dev/tty"
    return 0
  fi
  # Fall back to stderr (still useful in CI/agent logs with \r updates).
  NL_PROGRESS_TTY=""
  return 0
}

nl_progress_fmt_duration() {
  local secs="${1:-0}"
  if [ "$secs" -lt 0 ]; then secs=0; fi
  local h=$((secs / 3600))
  local m=$(((secs % 3600) / 60))
  local s=$((secs % 60))
  if [ "$h" -gt 0 ]; then
    printf '%dh%02dm%02ds' "$h" "$m" "$s"
  elif [ "$m" -gt 0 ]; then
    printf '%dm%02ds' "$m" "$s"
  else
    printf '%ds' "$s"
  fi
}

nl_progress_bar() {
  local pct="$1"
  local width="${2:-$NL_PROGRESS_WIDTH}"
  if [ "$pct" -lt 0 ]; then pct=0; fi
  if [ "$pct" -gt 100 ]; then pct=100; fi
  local filled=$((pct * width / 100))
  local empty=$((width - filled))
  local bar=""
  local i
  for ((i = 0; i < filled; i++)); do bar+="█"; done
  for ((i = 0; i < empty; i++)); do bar+="░"; done
  printf '%s' "$bar"
}

nl_progress_timings_path() {
  local root="${ROOT:-.}"
  local dir="${root}/.cache"
  mkdir -p "$dir"
  echo "${dir}/docker-build-timings.env"
}

nl_progress_load_timing() {
  local key="$1"
  local default="$2"
  local file
  file="$(nl_progress_timings_path)"
  NL_PROGRESS_TIMINGS_FILE="$file"
  if [ -f "$file" ]; then
    # shellcheck disable=SC1090
    local val
    val="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
    if [[ "$val" =~ ^[0-9]+$ ]] && [ "$val" -gt 5 ]; then
      echo "$val"
      return 0
    fi
  fi
  echo "$default"
}

nl_progress_save_timing() {
  local key="$1"
  local secs="$2"
  local file
  file="$(nl_progress_timings_path)"
  NL_PROGRESS_TIMINGS_FILE="$file"
  touch "$file"
  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    # portable in-place update
    local tmp
    tmp="$(mktemp)"
    grep -vE "^${key}=" "$file" >"$tmp" || true
    echo "${key}=${secs}" >>"$tmp"
    mv "$tmp" "$file"
  else
    echo "${key}=${secs}" >>"$file"
  fi
}

nl_progress_render() {
  local now elapsed_job elapsed_phase pct remaining eta_phase eta_job
  now=$(date +%s)
  elapsed_job=$((now - NL_PROGRESS_JOB_START))
  elapsed_phase=$((now - NL_PROGRESS_PHASE_START))

  # Interpolate within phase toward phase end (leave 1% until phase completes).
  local span=$((NL_PROGRESS_PCT_END - NL_PROGRESS_PCT_START))
  local phase_frac=0
  if [ "${NL_PROGRESS_PHASE_ETA}" -gt 0 ]; then
    phase_frac=$((elapsed_phase * 100 / NL_PROGRESS_PHASE_ETA))
    if [ "$phase_frac" -gt 95 ]; then phase_frac=95; fi
  else
    # Slow creep when no estimate.
    phase_frac=$((elapsed_phase / 3))
    if [ "$phase_frac" -gt 80 ]; then phase_frac=80; fi
  fi
  pct=$((NL_PROGRESS_PCT_START + (span * phase_frac / 100)))
  if [ "$pct" -ge "$NL_PROGRESS_PCT_END" ] && [ "$NL_PROGRESS_PCT_END" -lt 100 ]; then
    pct=$((NL_PROGRESS_PCT_END - 1))
  fi
  if [ "$pct" -gt 99 ]; then pct=99; fi

  # Remaining for current phase + remaining job estimate.
  if [ "${NL_PROGRESS_PHASE_ETA}" -gt 0 ]; then
    eta_phase=$((NL_PROGRESS_PHASE_ETA - elapsed_phase))
    if [ "$eta_phase" -lt 0 ]; then eta_phase=0; fi
  else
    eta_phase=-1
  fi

  if [ "${NL_PROGRESS_JOB_ETA}" -gt 0 ] && [ "$pct" -gt 0 ]; then
    # Blend: time-from-% and phase remainder.
    local by_pct=$((NL_PROGRESS_JOB_ETA * (100 - pct) / 100))
    if [ "$eta_phase" -ge 0 ]; then
      remaining=$(( (by_pct + eta_phase) / 2 ))
    else
      remaining=$by_pct
    fi
  elif [ "$eta_phase" -ge 0 ]; then
    remaining=$eta_phase
  else
    remaining=-1
  fi

  local bar elapsed_s remain_s phase_s
  bar="$(nl_progress_bar "$pct")"
  elapsed_s="$(nl_progress_fmt_duration "$elapsed_job")"
  phase_s="$(nl_progress_fmt_duration "$elapsed_phase")"
  if [ "$remaining" -ge 0 ]; then
    remain_s="$(nl_progress_fmt_duration "$remaining")"
  else
    remain_s="…"
  fi

  local line
  line=$(printf '\r\033[K[%s] %3d%% │ %s │ elapsed %s │ ETA ~%s │ phase %s' \
    "$bar" "$pct" "$NL_PROGRESS_LABEL" "$elapsed_s" "$remain_s" "$phase_s")

  if [ -n "${NL_PROGRESS_TTY}" ]; then
    printf '%s' "$line" >"$NL_PROGRESS_TTY" 2>/dev/null || printf '%s' "$line" >&2
  else
    printf '%s' "$line" >&2
  fi
}

nl_progress_timer_loop() {
  local lock="$1"
  while [ -f "$lock" ]; do
    nl_progress_render || true
    sleep 1
  done
}

nl_progress_stop_timer() {
  if [ -n "${NL_PROGRESS_LOCK:-}" ] && [ -f "${NL_PROGRESS_LOCK}" ]; then
    rm -f "${NL_PROGRESS_LOCK}"
  fi
  if [ -n "${NL_PROGRESS_TIMER_PID:-}" ]; then
    wait "${NL_PROGRESS_TIMER_PID}" 2>/dev/null || true
    NL_PROGRESS_TIMER_PID=""
  fi
  # Clear status line
  if [ "${NL_PROGRESS_ENABLED}" = "1" ]; then
    if [ -n "${NL_PROGRESS_TTY}" ]; then
      printf '\r\033[K' >"$NL_PROGRESS_TTY" 2>/dev/null || printf '\r\033[K' >&2
    else
      printf '\r\033[K' >&2
    fi
  fi
}

nl_progress_job_start() {
  local label="$1"
  local job_eta_sec="${2:-900}"
  NL_PROGRESS_JOB_START=$(date +%s)
  NL_PROGRESS_JOB_ETA="$job_eta_sec"
  NL_PROGRESS_LABEL="$label"
  NL_PROGRESS_PHASE=0
  NL_PROGRESS_PHASES=1
  NL_PROGRESS_PCT_START=0
  NL_PROGRESS_PCT_END=100
  NL_PROGRESS_PHASE_ETA="$job_eta_sec"
  NL_PROGRESS_PHASE_START=$(date +%s)

  if ! nl_progress_available; then
    echo "==> ${label} (progress UI disabled — no TTY or NESTLANCER_PROGRESS=0)"
    return 0
  fi

  echo ""
  echo "┌──────────────────────────────────────────────────────────────"
  echo "│ Build progress: ${label}"
  echo "│ Estimate: ~$(nl_progress_fmt_duration "$job_eta_sec") (updates from prior runs)"
  echo "│ Tip: NESTLANCER_PROGRESS=0 disables this UI"
  echo "└──────────────────────────────────────────────────────────────"
}

nl_progress_phase_start() {
  local phase="$1"
  local total="$2"
  local label="$3"
  local pct_start="$4"
  local pct_end="$5"
  local phase_eta="$6"

  # Finish previous timer if any
  nl_progress_stop_timer

  NL_PROGRESS_ACTIVE_PHASE=1
  NL_PROGRESS_PHASE="$phase"
  NL_PROGRESS_PHASES="$total"
  NL_PROGRESS_LABEL="[${phase}/${total}] ${label}"
  NL_PROGRESS_PCT_START="$pct_start"
  NL_PROGRESS_PCT_END="$pct_end"
  NL_PROGRESS_PHASE_ETA="$phase_eta"
  NL_PROGRESS_PHASE_START=$(date +%s)

  echo ""
  echo "==> Phase ${phase}/${total}: ${label}  (est. ~$(nl_progress_fmt_duration "$phase_eta"))"

  if ! nl_progress_available; then
    return 0
  fi

  NL_PROGRESS_LOCK="$(mktemp)"
  # shellcheck disable=SC2064
  trap 'nl_progress_stop_timer; NL_PROGRESS_ACTIVE_PHASE=0' EXIT
  nl_progress_timer_loop "$NL_PROGRESS_LOCK" &
  NL_PROGRESS_TIMER_PID=$!
}

nl_progress_phase_end() {
  local timing_key="${1:-}"
  local now elapsed
  now=$(date +%s)
  elapsed=$((now - NL_PROGRESS_PHASE_START))
  nl_progress_stop_timer
  NL_PROGRESS_ACTIVE_PHASE=0

  if [ -n "$timing_key" ] && [ "$elapsed" -gt 5 ]; then
    nl_progress_save_timing "$timing_key" "$elapsed"
  fi

  echo "✔ Phase done in $(nl_progress_fmt_duration "$elapsed")"
}

nl_progress_job_end() {
  local now elapsed
  now=$(date +%s)
  elapsed=$((now - NL_PROGRESS_JOB_START))
  nl_progress_stop_timer
  trap - EXIT 2>/dev/null || true

  local bar
  bar="$(nl_progress_bar 100)"
  echo ""
  echo "[${bar}] 100% │ completed in $(nl_progress_fmt_duration "$elapsed")"
  echo ""
}

# Run a command while the live progress line ticks (phase must already be started).
nl_progress_run() {
  if ! nl_progress_available; then
    "$@"
    return $?
  fi
  # Ensure timer is running for this phase
  if [ -z "${NL_PROGRESS_TIMER_PID:-}" ] || ! kill -0 "${NL_PROGRESS_TIMER_PID}" 2>/dev/null; then
    NL_PROGRESS_LOCK="$(mktemp)"
    nl_progress_timer_loop "$NL_PROGRESS_LOCK" &
    NL_PROGRESS_TIMER_PID=$!
  fi
  "$@"
  local rc=$?
  return "$rc"
}
