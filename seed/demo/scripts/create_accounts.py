#!/usr/bin/env python3
"""Step 1 — register demo client accounts.

Reads data/accounts/profiles/*.json, registers (or logs in to) each account,
sets emailVerified=true in the database, and writes seeded-users.json for step 2.

Usage:
    python3 prod-data/user-admin-interaction/scripts/create_accounts.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from lib.api_client import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    admin_reset_user_password,
    fail,
    get_user_id_by_email,
    log,
    login,
    register_user,
    resolve_client_password,
    update_user_profile,
    upload_user_avatar,
    verify_emails_in_database,
    warn,
    write_seeded_users,
    load_accounts_index,
)
from lib.paths import ACCOUNTS_DIR, GENERATED_DIR
from lib.profile_content import enrich_profile_doc
from lib.scenario_loader import load_profile

# Gateway auth rate limits burst register/login; pace account creation.
REGISTER_PACING_SECONDS = float(__import__("os").environ.get("SEED_REGISTER_PACING", "1.5"))


def resolve_avatar_path(profile_doc: dict) -> Path | None:
    rel = profile_doc.get("avatarLocal")
    if rel:
        return ACCOUNTS_DIR / rel
    # Legacy fallback: generated initials PNG
    legacy = profile_doc.get("avatarFile")
    if legacy:
        return GENERATED_DIR / legacy
    return None


def apply_profile_and_avatar(token: str, profile_doc: dict) -> None:
    profile = profile_doc["profile"]
    email = profile["email"]
    if update_user_profile(token, profile):
        log(f"  profile fields saved for {email}")
    avatar_path = resolve_avatar_path(profile_doc)
    if not avatar_path:
        return
    if avatar_path.exists():
        if upload_user_avatar(token, avatar_path):
            log(f"  avatar uploaded for {email}")
    else:
        warn(f"  avatar missing for {email} ({avatar_path}) — run scripts/download_avatar_images.py")


def ensure_account(profile: dict, password: str, admin_token: str | None = None) -> tuple[str, str]:
    email = profile["email"]
    token, user_id = login(email, password)
    if user_id:
        log(f"  existing account: {email} ({user_id})")
        return token, user_id

    existing_id = get_user_id_by_email(email)
    if existing_id:
        if not admin_token:
            admin_token, _ = login(ADMIN_EMAIL, ADMIN_PASSWORD, portal="admin")
        if not admin_token:
            fail(f"Account {email} exists but login failed — admin token required to reset password")
        log(f"  resetting password for existing account: {email}")
        admin_reset_user_password(admin_token, existing_id, password)
        token, user_id = login(email, password)
        if user_id:
            return token, user_id
        fail(f"Password reset succeeded but login still failed for {email}")

    log(f"  registering {email} ...")
    return register_user(profile, password)


def main() -> None:
    index = load_accounts_index()
    seeded: list[dict] = []
    profile_docs: list[dict] = []

    admin_token, _ = login(ADMIN_EMAIL, ADMIN_PASSWORD, portal="admin")
    if not admin_token:
        fail("Admin login failed — run layer init (seed_core) before create_accounts")

    log(f"Step 1 — creating {len(index['users'])} client accounts ...")
    for user_entry in index["users"]:
        profile_doc = enrich_profile_doc(load_profile(user_entry["seedKey"]))
        profile = profile_doc["profile"]
        password = resolve_client_password(profile["email"])
        profile_docs.append(profile_doc)
        _, user_id = ensure_account(profile, password, admin_token=admin_token)
        seeded.append({
            "seedKey": user_entry["seedKey"],
            "displayName": user_entry["displayName"],
            "email": profile["email"],
            "password": password,
            "userId": user_id,
            "emailVerified": True,
        })
        if REGISTER_PACING_SECONDS > 0:
            time.sleep(REGISTER_PACING_SECONDS)

    emails = [u["email"] for u in seeded]
    log("Verifying emails in database ...")
    verify_emails_in_database(emails)

    log("Applying profile fields and avatars (post email verification) ...")
    for profile_doc in profile_docs:
        profile = profile_doc["profile"]
        password = resolve_client_password(profile["email"])
        token, _ = login(profile["email"], password)
        if not token:
            warn(f"  could not login for profile sync: {profile['email']}")
            continue
        apply_profile_and_avatar(token, profile_doc)

    write_seeded_users(seeded)
    log("Step 1 complete. Run scripts/seed_scenarios.py next.")


if __name__ == "__main__":
    main()
