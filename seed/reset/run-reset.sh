#!/usr/bin/env bash
# Empty every configured S3/MinIO bucket and truncate database rows.
# Tables and _prisma_migrations stay.
#
# Prefer: bash seed/seed.sh --env=dev --phase=reset
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== Full environment reset (S3/MinIO + database) ==="

python3 seed/reset/scripts/reset_cloud_storage.py
python3 seed/reset/scripts/reset_database.py --verify

GENERATED="$ROOT/seed/.generated"
if [[ -d "$GENERATED" ]]; then
  rm -rf "$GENERATED"
  echo "[reset] Removed seed/.generated/"
fi

echo "=== Reset complete ==="
echo "Next: bash seed/seed.sh --env=dev --phase=core,content,demo --skip-export"
