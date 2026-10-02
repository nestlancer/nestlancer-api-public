#!/usr/bin/env bash
# Strip Infisical dotenv quotes so Docker Compose / kubectl --from-env-file
# do not inject literal quotes into process.env (breaks RATE_LIMIT_ENABLED='false').
#
# Usage: bash scripts/docker/sanitize-infisical-env.sh [.env.infisical]
set -euo pipefail
f="${1:-.env.infisical}"
if [ ! -f "$f" ]; then
  echo "WARN: $f missing — nothing to sanitize" >&2
  exit 0
fi
# Infisical can emit KEY=''value''
sed -i "s/=''\([^']*\)''/='\1'/g" "$f"
# Strip surrounding single/double quotes on values
sed -i -E "s/^([^=]+)='(.*)'$/\1=\2/" "$f"
sed -i -E 's/^([^=]+)="(.*)"$/\1=\2/' "$f"
