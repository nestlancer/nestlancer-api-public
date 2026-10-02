#!/usr/bin/env python3
"""Prune demo users to a fixed keep-list (default: first 15 clients + admin via index)."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "payloads" / "demo"
ACCOUNTS_INDEX = DEMO / "accounts" / "index.json"
SCENARIOS_INDEX = DEMO / "scenarios" / "index.json"
PROFILES_DIR = DEMO / "accounts" / "profiles"
SCENARIOS_USERS = DEMO / "scenarios" / "users"
AVATARS_DIR = DEMO / "accounts" / "avatars"
GENERATED_UAI = ROOT / ".generated" / "demo"

KEEP_KEYS = [
    "arjun-mehta",
    "samira-patel",
    "rahul-desai",
    "ananya-iyer",
    "priya-nair",
    "vikram-shah",
    "kavya-reddy",
    "rajan-kumar",
    "divya-sharma",
    "amit-verma",
    "neha-gupta",
    "suresh-iyer",
    "pooja-kulkarni",
    "karthik-menon",
    "sandeep-chopra",
]
KEEP = set(KEEP_KEYS)


def filter_index(path: Path) -> list[str]:
    data = json.loads(path.read_text())
    before = len(data["users"])
    data["users"] = [u for u in data["users"] if u["seedKey"] in KEEP]
    path.write_text(json.dumps(data, indent=2) + "\n")
    return [u["seedKey"] for u in data["users"]], before - len(data["users"])


def main() -> None:
    kept_accounts, removed_accounts = filter_index(ACCOUNTS_INDEX)
    kept_scenarios, removed_scenarios = filter_index(SCENARIOS_INDEX)
    assert kept_accounts == kept_scenarios == KEEP_KEYS

    removed_profiles = 0
    for p in PROFILES_DIR.glob("*.json"):
        if p.stem not in KEEP:
            p.unlink()
            removed_profiles += 1

    removed_avatar_jpg = 0
    for p in AVATARS_DIR.glob("*.jpg"):
        if p.stem not in KEEP:
            p.unlink()
            removed_avatar_jpg += 1

    removed_scenario_dirs = 0
    for d in SCENARIOS_USERS.iterdir():
        if d.is_dir() and d.name not in KEEP:
            shutil.rmtree(d)
            removed_scenario_dirs += 1

    removed_generated = 0
    gen_users = GENERATED_UAI / "users"
    if gen_users.is_dir():
        for d in gen_users.iterdir():
            if d.is_dir() and d.name not in KEEP:
                shutil.rmtree(d)
                removed_generated += 1

    for f in (
        ROOT / ".generated-client-passwords.json",
        ROOT / ".generated-seed-credentials.env",
        GENERATED_UAI / "seeded-users.json",
    ):
        if f.exists():
            f.unlink()

    print(f"[prune] kept {len(KEEP_KEYS)} client users")
    print(f"[prune] removed from indexes: accounts={removed_accounts}, scenarios={removed_scenarios}")
    print(f"[prune] deleted profiles={removed_profiles}, avatars={removed_avatar_jpg}")
    print(f"[prune] deleted scenario dirs={removed_scenario_dirs}, generated dirs={removed_generated}")


if __name__ == "__main__":
    main()
