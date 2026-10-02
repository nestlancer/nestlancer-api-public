#!/usr/bin/env python3
"""Download real portrait photos for demo client avatars.

Stores JPEG files under data/accounts/avatars/ (same pattern as blog featured images).
Source: randomuser.me portrait library (free for demos; see avatars/README.md).

Usage:
    python3 prod-data/user-admin-interaction/scripts/download_avatar_images.py
    python3 prod-data/user-admin-interaction/scripts/download_avatar_images.py --force
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from lib.avatar_portraits import portrait_gender, portrait_index
from lib.paths import ACCOUNTS_DIR, ACCOUNTS_INDEX, AVATARS_DIR
from lib.scenario_loader import load_profile

PORTRAIT_BASE = "https://randomuser.me/api/portraits"
SOURCES_JSON = AVATARS_DIR / "sources.json"
USER_AGENT = "nestlancer-prod-data-avatars/1.0"


def portrait_url(gender: str, index: int) -> str:
    return f"{PORTRAIT_BASE}/{gender}/{index}.jpg"


def download_one(url: str, dest: Path) -> None:
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
    resp.raise_for_status()
    if len(resp.content) < 1024:
        raise RuntimeError(f"Response too small ({len(resp.content)} bytes) from {url}")
    dest.write_bytes(resp.content)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-download even if file exists")
    args = parser.parse_args()

    if not ACCOUNTS_INDEX.exists():
        raise SystemExit(f"Missing {ACCOUNTS_INDEX}")

    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    index = json.loads(ACCOUNTS_INDEX.read_text())
    sources: dict[str, dict] = {}
    if SOURCES_JSON.exists() and not args.force:
        sources = json.loads(SOURCES_JSON.read_text())

    used_by_gender: dict[str, set[int]] = {"men": set(), "women": set()}
    downloaded = skipped = 0

    for entry in index["users"]:
        seed_key = entry["seedKey"]
        profile = load_profile(seed_key)["profile"]
        first_name = profile["firstName"]
        gender = portrait_gender(first_name)
        used = used_by_gender[gender]

        idx = portrait_index(seed_key, used)
        used.add(idx)

        dest = AVATARS_DIR / f"{seed_key}.jpg"
        url = portrait_url(gender, idx)

        if dest.exists() and dest.stat().st_size > 1024 and not args.force:
            skipped += 1
            sources.setdefault(seed_key, {"url": url, "gender": gender, "index": idx})
            continue

        print(f"[avatars] {seed_key} <- {url}")
        download_one(url, dest)
        sources[seed_key] = {
            "url": url,
            "gender": gender,
            "index": idx,
            "displayName": entry.get("displayName", ""),
            "source": "randomuser.me",
            "license": "https://randomuser.me/",
        }
        downloaded += 1
        time.sleep(0.15)

    manifest = {
        "version": 1,
        "attribution": "Portrait photos from randomuser.me (demo use). Mention randomuser.me if displayed publicly.",
        "portraits": sources,
    }
    SOURCES_JSON.write_text(json.dumps(manifest, indent=2) + "\n")

    # Update profile JSON avatarLocal fields
    for entry in index["users"]:
        seed_key = entry["seedKey"]
        profile_path = ACCOUNTS_DIR / "profiles" / f"{seed_key}.json"
        if not profile_path.exists():
            continue
        doc = json.loads(profile_path.read_text())
        doc["avatarLocal"] = f"avatars/{seed_key}.jpg"
        doc.pop("avatarFile", None)
        profile_path.write_text(json.dumps(doc, indent=2) + "\n")

    print(f"[avatars] Done — {downloaded} downloaded, {skipped} skipped -> {AVATARS_DIR}")


if __name__ == "__main__":
    main()
