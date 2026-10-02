#!/usr/bin/env bash
# Compatibility wrapper. The seed system lives in seed/.
echo "[seed] prod-data/run-seed.sh moved. Use: bash seed/seed.sh" >&2
exec bash "$(cd "$(dirname "$0")/.." && pwd)/seed/seed.sh" "$@"
