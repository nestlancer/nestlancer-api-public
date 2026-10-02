#!/usr/bin/env bash
# Harden a Linux VPS so Docker/Nest workloads cannot lock operators out of SSH.
#
# What this does (idempotent):
#   1. Protect sshd from OOM killer (OOMScoreAdjust=-1000, MemoryMin)
#   2. Raise vm.admin_reserve_kbytes so root can still fork a shell under pressure
#   3. Lower vm.swappiness (prefer reclaim / fail-fast over long swap thrash)
#   4. Optionally shrink oversized swap (default target 2G) — swap storms lock SSH
#
# Usage (root):
#   sudo bash scripts/docker/harden-host-ssh-safe.sh
#   sudo SWAP_TARGET_GIB=2 bash scripts/docker/harden-host-ssh-safe.sh
#   sudo SKIP_SWAP_RESIZE=1 bash scripts/docker/harden-host-ssh-safe.sh
#
# Refs:
#   https://ianlpaterson.com/blog/oom-lockout-ssh-survival-hardening/
#   https://www.netdata.cloud/guides/docker/docker-memory-limits/
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (sudo)." >&2
  exit 1
fi

SWAP_TARGET_GIB="${SWAP_TARGET_GIB:-2}"
SKIP_SWAP_RESIZE="${SKIP_SWAP_RESIZE:-0}"
SYSCTL_FILE="/etc/sysctl.d/99-nestlancer-ssh-safe.conf"
SSHD_DROPIN_DIR="/etc/systemd/system/ssh.service.d"
SSHD_DROPIN="${SSHD_DROPIN_DIR}/oom-protect.conf"

echo "==> Writing ${SYSCTL_FILE}"
cat >"$SYSCTL_FILE" <<'EOF'
# Nestlancer SSH-safe VPS defaults (prevent Docker thrash lockouts)
# Prefer killing pressured workloads early over minutes of swap storms.
vm.swappiness = 10
# Reserve ~256MB that only privileged/root recovery paths can use under pressure
vm.admin_reserve_kbytes = 262144
EOF
sysctl --system >/dev/null
sysctl vm.swappiness vm.admin_reserve_kbytes

echo "==> Protecting sshd from OOM (${SSHD_DROPIN})"
mkdir -p "$SSHD_DROPIN_DIR"
cat >"$SSHD_DROPIN" <<'EOF'
[Service]
# Prefer killing app containers / workers over sshd under host pressure
OOMScoreAdjust=-1000
# Keep a small guaranteed slice so a recovery shell can still fork
MemoryMin=64M
MemoryLow=128M
EOF

# Ubuntu uses ssh.service; alias covers sshd.service
systemctl daemon-reload
if systemctl is-enabled ssh >/dev/null 2>&1 || systemctl is-active ssh >/dev/null 2>&1; then
  systemctl restart ssh
elif systemctl is-enabled sshd >/dev/null 2>&1 || systemctl is-active sshd >/dev/null 2>&1; then
  # Some images only expose sshd
  mkdir -p /etc/systemd/system/sshd.service.d
  cp "$SSHD_DROPIN" /etc/systemd/system/sshd.service.d/oom-protect.conf
  systemctl daemon-reload
  systemctl restart sshd
fi

# Verify adjust on running sshd master if present
if pgrep -x sshd >/dev/null 2>&1; then
  echo "==> sshd oom_score_adj samples:"
  for pid in $(pgrep -x sshd | head -5); do
    adj="$(cat /proc/"$pid"/oom_score_adj 2>/dev/null || echo '?')"
    echo "  pid=${pid} oom_score_adj=${adj}"
  done
fi

if [ "$SKIP_SWAP_RESIZE" = "1" ]; then
  echo "==> SKIP_SWAP_RESIZE=1 — leaving swap layout unchanged"
else
  SWAPFILE="${SWAPFILE:-/swapfile}"
  if [ -f "$SWAPFILE" ] || swapon --show --noheadings | grep -q .; then
    current_bytes="$(swapon --show=SIZE --bytes --noheadings 2>/dev/null | awk '{s+=$1} END{print s+0}')"
    target_bytes=$((SWAP_TARGET_GIB * 1024 * 1024 * 1024))
    echo "==> Current swap bytes=${current_bytes} target=${target_bytes} (${SWAP_TARGET_GIB}G)"

    # Only shrink when clearly oversized (>3G) and target is smaller — avoid thrash “capacity”
    if [ "${current_bytes}" -gt $((3 * 1024 * 1024 * 1024)) ] && [ "${target_bytes}" -lt "${current_bytes}" ]; then
      used="$(swapon --show=USED --bytes --noheadings 2>/dev/null | awk '{s+=$1} END{print s+0}')"
      if [ "${used}" -gt $((64 * 1024 * 1024)) ]; then
        echo "WARN: swap is actively used (${used} bytes). Skip resize; reclaim memory first." >&2
      else
        echo "==> Resizing ${SWAPFILE} → ${SWAP_TARGET_GIB}G (prevents swap-storm SSH lockouts)"
        swapoff -a || true
        if [ -f "$SWAPFILE" ]; then
          rm -f "$SWAPFILE"
        fi
        # Prefer fallocate; fall back to dd
        if ! fallocate -l "${SWAP_TARGET_GIB}G" "$SWAPFILE" 2>/dev/null; then
          dd if=/dev/zero of="$SWAPFILE" bs=1M count=$((SWAP_TARGET_GIB * 1024)) status=progress
        fi
        chmod 600 "$SWAPFILE"
        mkswap "$SWAPFILE"
        swapon "$SWAPFILE"
        if grep -qE '^\s*/swapfile\s' /etc/fstab 2>/dev/null; then
          sed -i 's|^[[:space:]]*/swapfile[[:space:]].*|/swapfile none swap sw 0 0|' /etc/fstab
        elif ! grep -qE 'swap' /etc/fstab 2>/dev/null; then
          echo '/swapfile none swap sw 0 0' >>/etc/fstab
        fi
        swapon --show
      fi
    else
      echo "==> Swap size OK for SSH-safe policy (or already ≤ target)"
      swapon --show || true
    fi
  else
    echo "==> No swap configured — creating ${SWAP_TARGET_GIB}G spike buffer at ${SWAPFILE}"
    if ! fallocate -l "${SWAP_TARGET_GIB}G" "$SWAPFILE" 2>/dev/null; then
      dd if=/dev/zero of="$SWAPFILE" bs=1M count=$((SWAP_TARGET_GIB * 1024)) status=progress
    fi
    chmod 600 "$SWAPFILE"
    mkswap "$SWAPFILE"
    swapon "$SWAPFILE"
    if ! grep -qE '^\s*/swapfile\s' /etc/fstab 2>/dev/null; then
      echo '/swapfile none swap sw 0 0' >>/etc/fstab
    fi
    swapon --show
  fi
fi

echo
echo "Host hardening complete."
echo "Next: keep provider console open, then: pnpm docker:up   (core only — do NOT start with :full)"
echo "Override full stack only after headroom check: NESTLANCER_ALLOW_FULL=1 pnpm docker:up:full"
