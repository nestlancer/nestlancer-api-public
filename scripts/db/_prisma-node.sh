#!/usr/bin/env bash
# Resolve a Node binary compatible with Prisma 7 (>= 20.19).
# Source from other scripts/db/*.sh — do not execute directly.
_prisma_node_resolve() {
  NODE_BIN="${NODE_BIN:-node}"

  if [ -x "${NVM_DIR:-$HOME/.nvm}/versions/node/v20.19.6/bin/node" ]; then
    NODE_BIN="${NVM_DIR:-$HOME/.nvm}/versions/node/v20.19.6/bin/node"
  elif [ -x "${NVM_DIR:-$HOME/.nvm}/versions/node/v20.19.0/bin/node" ]; then
    NODE_BIN="${NVM_DIR:-$HOME/.nvm}/versions/node/v20.19.0/bin/node"
  fi

  export NODE_BIN
}

_prisma_cli() {
  PRISMA_CLI=("$NODE_BIN" "$ROOT/node_modules/prisma/build/index.js" --config "$ROOT/prisma.config.ts")
}
