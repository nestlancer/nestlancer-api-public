#!/usr/bin/env python3
"""Add headline, bio, skills, and avatarFile to all account profile JSON files.

Usage:
    python3 prod-data/user-admin-interaction/scripts/enrich_profiles.py
    python3 prod-data/user-admin-interaction/scripts/enrich_profiles.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from lib.paths import ACCOUNTS_DIR, ACCOUNTS_INDEX
from lib.profile_content import enrich_profile_doc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    index = json.loads(ACCOUNTS_INDEX.read_text())
    updated = 0

    for entry in index["users"]:
        seed_key = entry["seedKey"]
        path = ACCOUNTS_DIR / "profiles" / f"{seed_key}.json"
        if not path.exists():
            print(f"[warn] missing profile: {path}")
            continue
        doc = json.loads(path.read_text())
        enriched = enrich_profile_doc(doc)
        if enriched != doc:
            updated += 1
        if not args.dry_run:
            path.write_text(json.dumps(enriched, indent=2) + "\n")
        print(f"[enrich] {seed_key}: {enriched['profile'].get('headline', '')[:60]}...")

    print(f"[enrich] Done — {updated} profile(s) updated" + (" (dry run)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
