"""Credential helpers for reset scripts.

Object storage credentials come from Infisical (`.env.infisical` → `S3_*`).
Optional `config/.env.reset` is retained only for local overrides (rarely needed).
"""

from __future__ import annotations

import os
from pathlib import Path

RESET_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = RESET_DIR / "config"
RESET_ENV_FILE = CONFIG_DIR / ".env.reset"
RESET_ENV_EXAMPLE = CONFIG_DIR / ".env.reset.example"


def load_reset_env() -> None:
    """Load optional prod-data/reset/config/.env.reset (does not override existing vars)."""
    if not RESET_ENV_FILE.exists():
        return
    for line in RESET_ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value
