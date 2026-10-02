"""Path constants for the seed runner. This file lives at seed/lib/paths.py."""

from __future__ import annotations

from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = SEED_DIR.parent
PAYLOADS_DIR = SEED_DIR / "payloads"
GENERATED_DIR = SEED_DIR / ".generated"
RESET_DIR = SEED_DIR / "reset"
DEMO_DIR = SEED_DIR / "demo"
INFISICAL_ENV = REPO_ROOT / ".env.infisical"

# Alias kept so reset helpers that still say PROD_DATA_DIR resolve to seed/.
PROD_DATA_DIR = SEED_DIR
