#!/usr/bin/env python3
"""Seed demo auth audit events using prod-data cohort users.

Performs successful logins and deliberate failed attempts so the audit worker
can persist LOGIN / LOGIN_FAILED rows (category: auth).

Usage (from repo root):
  API_BASE_URL=https://dev-api.nestlancer.com/api/v1 \\
    python3 prod-data/user-admin-interaction/scripts/seed_audit_demo.py

Defaults to gateway URLs from .env.infisical when API_BASE_URL is unset.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

# Allow `from lib.api_client import ...` when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.api_client import (  # noqa: E402
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    SEEDED_USERS_JSON,
    curl_json,
    fail,
    load_infisical_env,
    log,
    login,
    unwrap_gateway_payload,
    warn,
)

load_infisical_env()

SUCCESS_LIMIT = 6
FAIL_LIMIT = 4
WRONG_PASSWORD = "WrongPassword!audit-demo"


def load_demo_users() -> list[dict]:
    if not SEEDED_USERS_JSON.exists():
        fail(f"Missing seeded users file: {SEEDED_USERS_JSON}")
    payload = json.loads(SEEDED_USERS_JSON.read_text())
    users = payload.get("users") or []
    if not users:
        fail("No users found in seeded-users.json — run create_accounts.py first")
    return users


def attempt_login(email: str, password: str) -> str:
    resp = curl_json(
        "POST",
        "/auth/login",
        body={"email": email, "password": password},
        service="auth",
        allow_error=True,
    )
    data = unwrap_gateway_payload(resp)
    if isinstance(data, dict) and data.get("accessToken"):
        return "LOGIN"
    err = resp.get("error") or (data.get("error") if isinstance(data, dict) else None)
    code = ""
    if isinstance(err, dict):
        code = str(err.get("code") or "")
    message = str(err.get("message") if isinstance(err, dict) else err or resp)
    if "AUTH_001" in code or "invalid" in message.lower():
        return "LOGIN_FAILED"
    return f"ERROR:{message[:120]}"


def fetch_audit_counts(admin_token: str) -> dict[str, int]:
    # Admin audit routes live on the gateway, not direct service ports.
    import os

    base = os.environ.get("API_BASE_URL", "").rstrip("/")
    if not base:
        warn("API_BASE_URL unset — skipping audit API verification")
        return {"auth_api_total": -1, "admin_api_total": -1}

    import requests

    headers = {"Authorization": f"Bearer {admin_token}"}
    auth_resp = requests.get(f"{base}/admin/logs?page=1&limit=1", headers=headers, timeout=30).json()
    admin_resp = requests.get(
        f"{base}/admin/users/logs?page=1&limit=1", headers=headers, timeout=30
    ).json()
    auth_data = unwrap_gateway_payload(auth_resp)
    admin_data = unwrap_gateway_payload(admin_resp)
    auth_total = 0
    admin_total = 0
    if isinstance(auth_data, dict):
        auth_total = int((auth_data.get("pagination") or {}).get("total") or 0)
    if isinstance(admin_data, dict):
        admin_total = int((admin_data.get("pagination") or {}).get("total") or 0)
    return {"auth_api_total": auth_total, "admin_api_total": admin_total}


def main() -> None:
    users = load_demo_users()
    log(f"Loaded {len(users)} prod-data users from {SEEDED_USERS_JSON.name}")

    successes = 0
    failures = 0

    for user in users[:SUCCESS_LIMIT]:
        email = user["email"]
        password = user["password"]
        result = attempt_login(email, password)
        if result == "LOGIN":
            successes += 1
            log(f"✓ LOGIN  {email}")
        else:
            warn(f"Expected LOGIN for {email}, got {result}")
        time.sleep(0.25)

    for user in users[SUCCESS_LIMIT : SUCCESS_LIMIT + FAIL_LIMIT]:
        email = user["email"]
        result = attempt_login(email, WRONG_PASSWORD)
        if result == "LOGIN_FAILED":
            failures += 1
            log(f"✓ LOGIN_FAILED  {email}")
        else:
            warn(f"Expected LOGIN_FAILED for {email}, got {result}")
        time.sleep(0.25)

    # Allow audit worker a moment to flush queued entries.
    log("Waiting 3s for audit worker…")
    time.sleep(3)

    admin_token, _ = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        warn("Could not login as admin to verify audit API totals")
    else:
        counts = fetch_audit_counts(admin_token)
        log(
            "Audit API totals — auth logs: "
            f"{counts['auth_api_total']}, admin logs: {counts['admin_api_total']}"
        )

    log(f"Done — {successes} successful logins, {failures} failed attempts queued")


if __name__ == "__main__":
    main()
