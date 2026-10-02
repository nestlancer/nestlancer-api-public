"""Directory layout for seed/demo scripts. Payloads live under seed/payloads/demo."""
from __future__ import annotations

from pathlib import Path

# seed/demo/
PACKAGE_ROOT = Path(__file__).resolve().parent.parent.parent

# seed/
PROD_DATA_DIR = PACKAGE_ROOT.parent
SEED_DIR = PROD_DATA_DIR

DATA_DIR = SEED_DIR / "payloads" / "demo"
ACCOUNTS_DIR = DATA_DIR / "accounts"
SCENARIOS_DIR = DATA_DIR / "scenarios"

ACCOUNTS_INDEX = ACCOUNTS_DIR / "index.json"
SCENARIOS_INDEX = SCENARIOS_DIR / "index.json"
AVATARS_DIR = ACCOUNTS_DIR / "avatars"

GENERATED_DIR = SEED_DIR / ".generated" / "demo"
SEEDED_USERS_JSON = GENERATED_DIR / "seeded-users.json"

REPO_ROOT = SEED_DIR.parent
INFISICAL_ENV = REPO_ROOT / ".env.infisical"
