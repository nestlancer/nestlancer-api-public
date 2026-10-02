#!/usr/bin/env python3
"""HTTP helpers, auth, and environment loading for demo seed scripts."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

from lib.paths import (
    ACCOUNTS_INDEX,
    GENERATED_DIR,
    INFISICAL_ENV,
    PROD_DATA_DIR,
    SEEDED_USERS_JSON,
)
from lib.profile_content import profile_patch_payload

DIRECT_SERVICES = {
    "auth",
    "users",
    "requests",
    "quotes",
    "projects",
    "progress",
    "messaging",
    "notifications",
    "payments",
    "media",
    "admin",
}


def _strip_env(value: str) -> str:
    return value.strip().strip("'").strip('"')


def _env_url(key: str, fallback: str) -> str:
    raw = _strip_env(os.environ.get(key, ""))
    if not raw:
        return _strip_env(fallback)
    return raw if raw.endswith("/api/v1") else f"{raw.rstrip('/')}/api/v1"


def _preserve_seed_http_override(key: str) -> bool:
    """Keep docker-direct / CLI HTTP targets; Infisical has unreachable 127.0.0.1 ports."""
    if key == "API_BASE_URL":
        return True
    return key.endswith("_SERVICE_URL") or key.endswith("_BASE_URL")


def load_infisical_env(*, force: bool = False) -> None:
    """Load .env.infisical into os.environ when present (dev docker stack).

    Existing env wins for HTTP targets (docker-direct *_SERVICE_URL from run-seed.sh).
    PROD_DATA_FORCE_INFISICAL still refreshes secrets, but never clobbers those URLs.
    """
    if not INFISICAL_ENV.exists():
        return
    force = force or os.environ.get("PROD_DATA_FORCE_INFISICAL", "").lower() in {
        "1",
        "true",
        "yes",
    }
    for line in INFISICAL_ENV.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = _strip_env(value)
        if not key:
            continue
        if key in os.environ and _preserve_seed_http_override(key):
            continue
        if force or key not in os.environ:
            os.environ[key] = value


load_infisical_env()

API_BASE_URL = _strip_env(os.environ.get("API_BASE_URL", "")).rstrip("/")
USE_GATEWAY = bool(API_BASE_URL)

SERVICE_BASES = {
    "auth": _env_url("AUTH_SERVICE_URL", _env_url("AUTH_BASE_URL", "http://127.0.0.1:3001")),
    "users": _env_url("USERS_SERVICE_URL", "http://127.0.0.1:3002"),
    "requests": _env_url("REQUESTS_SERVICE_URL", "http://127.0.0.1:3006"),
    "quotes": _env_url("QUOTES_SERVICE_URL", "http://127.0.0.1:3007"),
    "projects": _env_url("PROJECTS_SERVICE_URL", "http://127.0.0.1:3008"),
    "progress": _env_url("PROGRESS_SERVICE_URL", "http://127.0.0.1:3009"),
    "messaging": _env_url("MESSAGING_SERVICE_URL", "http://127.0.0.1:3010"),
    "notifications": _env_url("NOTIFICATIONS_SERVICE_URL", "http://127.0.0.1:3011"),
    "payments": _env_url("PAYMENTS_SERVICE_URL", "http://127.0.0.1:3003"),
    "media": _env_url("MEDIA_SERVICE_URL", "http://127.0.0.1:3012"),
    "admin": _env_url("ADMIN_SERVICE_URL", _env_url("ADMIN_BASE_URL", "http://127.0.0.1:3005")),
}

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nestlancer.com")
DEFAULT_SEED_PASSWORD = "REDACTED_DEMO_PASSWORD"
ADMIN_PASSWORD = DEFAULT_SEED_PASSWORD
CLIENT_PASSWORD = DEFAULT_SEED_PASSWORD
if os.environ.get("ADMIN_PASSWORD"):
    ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
if os.environ.get("CLIENT_PASSWORD"):
    CLIENT_PASSWORD = os.environ["CLIENT_PASSWORD"]
ADMIN_ORIGIN = (
    _strip_env(os.environ.get("ADMIN_URL", ""))
    or _strip_env(os.environ.get("SEED_ADMIN_ORIGIN", ""))
    or "https://admin.nestlancer.com"
)
CLIENT_ORIGIN = (
    _strip_env(os.environ.get("FRONTEND_URL", ""))
    or _strip_env(os.environ.get("WEB_URL", ""))
    or _strip_env(os.environ.get("SEED_CLIENT_ORIGIN", ""))
    or "https://app.nestlancer.com"
)


def resolve_client_password(email: str, *, fallback: str | None = None) -> str:
    """Return the password for a seeded client account."""
    return (fallback or CLIENT_PASSWORD or DEFAULT_SEED_PASSWORD).strip()


TURNSTILE_TOKEN = os.environ.get("TURNSTILE_BYPASS_TOKEN", "e2e-bypass-turnstile")
SEED_BYPASS_TOKEN = (
    os.environ.get("SEED_BYPASS_TOKEN", "").strip()
    or os.environ.get("TURNSTILE_BYPASS_TOKEN", "").strip()
)
USER_AGENT = os.environ.get("USER_AGENT", "nestlancer-prod-data-seed/2.0")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": USER_AGENT})
if SEED_BYPASS_TOKEN:
    _SESSION.headers["x-nestlancer-seed-token"] = SEED_BYPASS_TOKEN


def log(msg: str) -> None:
    print(f"[seed] {msg}")


def warn(msg: str) -> None:
    print(f"[warn] {msg}", file=sys.stderr)


def fail(msg: str) -> None:
    print(f"[fail] {msg}", file=sys.stderr)
    sys.exit(1)


def service_base(service: str) -> str:
    # Remote seeding: Infisical *_SERVICE_URL values are localhost; prefer gateway.
    if USE_GATEWAY and API_BASE_URL:
        return API_BASE_URL
    if service in DIRECT_SERVICES and service in SERVICE_BASES:
        return SERVICE_BASES[service]
    if USE_GATEWAY:
        return API_BASE_URL
    if service not in SERVICE_BASES:
        fail(f"Unknown service: {service}")
    return SERVICE_BASES[service]


def admin_milestone_request_payment_path(milestone_id: str) -> str:
    """Gateway exposes /admin/payments/milestones/:id/request-payment; payments svc uses /admin/milestones/:id/request-payment."""
    parsed = urlparse(service_base("payments"))
    if parsed.port == 3003:
        return f"/admin/milestones/{milestone_id}/request-payment"
    return f"/admin/payments/milestones/{milestone_id}/request-payment"


def unwrap_gateway_payload(payload: Any) -> Any:
    cur = payload
    for _ in range(4):
        if (
            isinstance(cur, dict)
            and cur.get("status") == "success"
            and "data" in cur
            and cur["data"] is not None
        ):
            cur = cur["data"]
            continue
        break
    return cur


def curl_json(
    method: str,
    path: str,
    token: str | None = None,
    body: dict | None = None,
    timeout: int = 60,
    service: str = "requests",
    allow_error: bool = False,
) -> dict:
    base = service_base(service)
    url = f"{base}{path}"
    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    # Portal-bound auth requires Origin matching admin/client app.
    if path.rstrip("/").endswith("/auth/login"):
        portal = (body or {}).get("portal") if isinstance(body, dict) else None
        origin = ADMIN_ORIGIN if portal == "admin" else CLIENT_ORIGIN
        headers["Origin"] = origin
        headers["Referer"] = f"{origin.rstrip('/')}/login"

    last_payload: dict = {}
    for attempt in range(1, 10):
        try:
            resp = _SESSION.request(
                method=method,
                url=url,
                headers=headers,
                json=body,
                timeout=timeout,
            )
        except requests.RequestException as exc:
            if allow_error:
                return {"status": "error", "message": str(exc)}
            fail(f"{method} {path} request failed: {exc}")

        if not resp.text.strip():
            return {}

        try:
            payload = resp.json()
        except json.JSONDecodeError:
            if allow_error:
                return {"status": "error", "message": resp.text[:500]}
            fail(f"{method} {path} invalid JSON: {resp.text[:500]}")

        last_payload = payload if isinstance(payload, dict) else {"data": payload}
        wait = _rate_limit_wait_seconds(last_payload)
        if wait is not None and attempt < 9:
            warn(f"Rate limited {method} {path} (attempt {attempt}/9) — sleeping {wait}s")
            time.sleep(wait)
            continue
        return last_payload

    return last_payload


def auth_payload(resp: dict) -> dict | None:
    if resp.get("status") != "success":
        return None
    data = unwrap_gateway_payload(resp)
    if not isinstance(data, dict):
        return None
    if data.get("status") == "error" or data.get("error"):
        return None
    if not data.get("accessToken") or not data.get("user", {}).get("id"):
        return None
    return data


def login(email: str, password: str, *, portal: str | None = None) -> tuple[str, str]:
    if portal not in ("client", "admin"):
        portal = "admin" if email.strip().lower() == ADMIN_EMAIL.lower() else "client"
    body: dict = {"email": email, "password": password, "portal": portal}
    # Auth TurnstileGuard requires a token; bypass value is accepted in seed/prod.
    if TURNSTILE_TOKEN:
        body["turnstileToken"] = TURNSTILE_TOKEN
    for attempt in range(1, 8):
        resp = curl_json(
            "POST", "/auth/login",
            body=body,
            service="auth", allow_error=True,
        )
        data = auth_payload(resp)
        if data:
            return data["accessToken"], data["user"]["id"]
        wait = _rate_limit_wait_seconds(resp)
        if wait is not None:
            warn(f"Rate limited login {email} (attempt {attempt}/7) — sleeping {wait}s")
            time.sleep(wait)
            continue
        return "", ""
    return "", ""


def get_user_id_by_email(email: str) -> str | None:
    if not DATABASE_URL:
        return None
    result = subprocess.run(
        [
            "psql", DATABASE_URL, "-t", "-A", "-c",
            f"SELECT id FROM \"User\" WHERE email = '{email.replace(chr(39), chr(39)+chr(39))}' LIMIT 1;",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    user_id = result.stdout.strip()
    return user_id or None


def _error_code(resp: dict) -> str:
    err = resp.get("error")
    if isinstance(err, dict):
        return str(err.get("code") or "")
    data = resp.get("data")
    if isinstance(data, dict) and isinstance(data.get("error"), dict):
        return str(data["error"].get("code") or "")
    return ""


def _rate_limit_wait_seconds(resp: dict) -> int | None:
    """Return sleep seconds for RATE_LIMIT_EXCEEDED (gateway throttle OR auth lockout).

    Infisical RATE_LIMIT_ENABLED=false disables gateway ThrottleGuard; auth lockout
    can still return the same error code. Prefer short backoff so seed recovers after
    auth restart / lockout clear instead of sleeping 90s × 9.
    """
    if _error_code(resp) != "RATE_LIMIT_EXCEEDED":
        return None
    err = resp.get("error") if isinstance(resp.get("error"), dict) else {}
    msg = str((err or {}).get("message") or resp)
    match = re.search(r"Retry after (\d+)", msg, re.I)
    # Cap wait — Cloudflare/WAF and account lockouts return large retry values.
    if match:
        return min(int(match.group(1)) + 2, 15)
    return 8


def register_user(profile: dict, password: str) -> tuple[str, str]:
    payload = {
        "email": profile["email"],
        "password": password,
        "firstName": profile["firstName"],
        "lastName": profile["lastName"],
        "acceptTerms": True,
        "turnstileToken": TURNSTILE_TOKEN,
    }
    if profile.get("phone"):
        payload["phone"] = profile["phone"]

    last_resp: dict = {}
    for attempt in range(1, 10):
        resp = curl_json("POST", "/auth/register", body=payload, service="auth", allow_error=True)
        last_resp = resp
        data = auth_payload(resp)
        if data:
            return data["accessToken"], data["user"]["id"]

        if resp.get("status") == "success":
            inner = unwrap_gateway_payload(resp)
            if isinstance(inner, dict) and inner.get("userId"):
                return "", inner["userId"]

        wait = _rate_limit_wait_seconds(resp)
        if wait is not None:
            warn(
                f"Rate limited registering {profile['email']} "
                f"(attempt {attempt}/9) — sleeping {wait}s"
            )
            time.sleep(wait)
            continue
        break

    token, user_id = login(profile["email"], password)
    if user_id:
        return token, user_id

    existing_id = get_user_id_by_email(profile["email"])
    if existing_id:
        fail(
            f"Account {profile['email']} exists but password does not match seed credentials. "
            "Re-run with a full reset layer or use admin reset-password before seeding."
        )

    fail(f"Could not register or login {profile['email']}: {json.dumps(last_resp)}")


def admin_reset_user_password(admin_token: str, user_id: str, new_password: str) -> None:
    # Hosted on users service (@Controller('admin/users')), not admin-service.
    resp = curl_json(
        "POST",
        f"/admin/users/{user_id}/reset-password",
        token=admin_token,
        body={"newPassword": new_password},
        service="users",
        allow_error=True,
    )
    data = unwrap_gateway_payload(resp)
    if resp.get("status") == "success":
        return
    if isinstance(data, dict) and data.get("status") != "error" and not data.get("error"):
        return
    fail(f"Admin reset-password failed for {user_id}: {json.dumps(resp)[:500]}")


def update_user_profile(token: str, profile: dict) -> bool:
    body = profile_patch_payload(profile)
    if not body:
        return True
    resp = curl_json(
        "PATCH",
        "/users/profile",
        token=token,
        body=body,
        service="users",
        allow_error=True,
    )
    data = unwrap_gateway_payload(resp)
    if isinstance(data, dict) and data.get("status") == "error":
        warn(f"Profile update failed for {profile.get('email')}: {json.dumps(data)}")
        return False
    if resp.get("status") == "success" or (isinstance(data, dict) and data.get("id")):
        return True
    warn(f"Unexpected profile update response for {profile.get('email')}: {json.dumps(resp)[:300]}")
    return False


def upload_user_avatar(token: str, image_path: Path) -> bool:
    if not image_path.exists():
        warn(f"Avatar file not found: {image_path}")
        return False
    base = service_base("users")
    url = f"{base}/users/avatar"
    resp = http_upload_file(image_path, url, token, field_name="file")
    data = unwrap_gateway_payload(resp)
    if isinstance(data, dict) and data.get("status") == "error":
        warn(f"Avatar upload failed: {json.dumps(data)}")
        return False
    if resp.get("status") == "success" or (isinstance(data, dict) and data.get("avatar")):
        return True
    warn(f"Unexpected avatar upload response: {json.dumps(resp)[:300]}")
    return False


def http_upload_file(
    file_path: Path,
    url: str,
    token: str,
    field_name: str = "file",
) -> dict:
    import mimetypes

    headers = {"Authorization": f"Bearer {token}"}
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    with file_path.open("rb") as handle:
        resp = _SESSION.post(
            url,
            headers=headers,
            files={field_name: (file_path.name, handle, mime)},
            timeout=120,
        )
    if not resp.text.strip():
        return {"status": "error", "message": f"HTTP {resp.status_code} empty body"}
    try:
        return resp.json()
    except json.JSONDecodeError:
        return {"status": "error", "message": resp.text[:500]}


def http_put_bytes(url: str, data: bytes, content_type: str) -> int:
    # Public presigned host plus a browser user-agent. Cloudflare returns 1010
    # for the seed agent, and rewriting the host breaks the signature.
    resp = _SESSION.put(
        url,
        data=data,
        headers={
            "Content-Type": content_type,
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            ),
        },
        timeout=120,
    )
    return resp.status_code


def load_accounts_index() -> dict:
    if not ACCOUNTS_INDEX.exists():
        fail(f"Missing {ACCOUNTS_INDEX}")
    return json.loads(ACCOUNTS_INDEX.read_text())


def load_seeded_users() -> dict:
    if not SEEDED_USERS_JSON.exists():
        fail(f"Missing {SEEDED_USERS_JSON} — run scripts/create_accounts.py first")
    return json.loads(SEEDED_USERS_JSON.read_text())


def verify_emails_in_database(emails: list[str]) -> None:
    if not emails:
        return
    if not DATABASE_URL:
        warn("DATABASE_URL not set — skipping direct emailVerified update")
        warn("Set DATABASE_URL and re-run step 1, or verify emails manually in the database")
        return

    email_list = ", ".join(f"'{e}'" for e in emails)
    sql = (
        f'UPDATE "User" SET "emailVerified" = true, "status" = \'ACTIVE\' '
        f'WHERE email IN ({email_list});'
    )
    result = subprocess.run(
        ["psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail(f"Database email verification failed: {result.stderr.strip() or result.stdout.strip()}")
    log(f"  emailVerified=true for {len(emails)} account(s) via database")


def future_valid_until(days: int = 365) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%dT23:59:59Z")


def replay_quote_accepted(quote_id: str, request_id: str, user_id: str) -> bool:
    if not DATABASE_URL:
        warn("DATABASE_URL not set — cannot replay QUOTE_ACCEPTED")
        return False
    payload = json.dumps({"quoteId": quote_id, "requestId": request_id, "userId": user_id})
    safe_payload = payload.replace("'", "''")
    sql = (
        f"INSERT INTO \"Outbox\" (id, type, \"aggregateType\", \"aggregateId\", payload, status) "
        f"VALUES (gen_random_uuid()::text, 'QUOTE_ACCEPTED', 'QUOTE', '{quote_id}', "
        f"'{safe_payload}'::jsonb, 'PENDING');"
    )
    result = subprocess.run(
        ["psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        warn(f"QUOTE_ACCEPTED replay failed: {result.stderr.strip() or result.stdout.strip()}")
        return False
    log(f"  replayed QUOTE_ACCEPTED for quote {quote_id}")
    return True


def write_seeded_users(users: list[dict]) -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "users": users,
    }
    SEEDED_USERS_JSON.write_text(json.dumps(payload, indent=2) + "\n")
    log(f"Wrote {SEEDED_USERS_JSON.relative_to(PROD_DATA_DIR)} ({len(users)} users)")
