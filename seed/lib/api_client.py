#!/usr/bin/env python3
"""Centralized Admin API client for prod-data seeding.

Loads Infisical (.env.infisical), authenticates as admin, and provides
retrying HTTP helpers used by seed_core / seed_blogs.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CLIENT_DIR = Path(__file__).resolve().parent
PROD_DATA_DIR = CLIENT_DIR.parent
REPO_ROOT = PROD_DATA_DIR.parent
INFISICAL_ENV = REPO_ROOT / ".env.infisical"
DATA_DIR = PROD_DATA_DIR / "payloads"

USER_AGENT = os.environ.get("USER_AGENT", "nestlancer-prod-data-seed/3.0")
PRESIGNED_PUT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


def _strip(value: str) -> str:
    return value.strip().strip("'").strip('"')


def _preserve_seed_http_override(key: str) -> bool:
    """Keep docker-direct / CLI HTTP targets; Infisical has unreachable 127.0.0.1 ports."""
    if key == "API_BASE_URL":
        return True
    return key.endswith("_SERVICE_URL") or key.endswith("_BASE_URL")


def load_infisical_env(*, force: bool = False) -> None:
    """Load repo-root `.env.infisical` into os.environ."""
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
        value = _strip(value)
        if not key:
            continue
        if key in os.environ and _preserve_seed_http_override(key):
            continue
        if force or key not in os.environ:
            os.environ[key] = value


load_infisical_env()


def _env_url(key: str, fallback: str) -> str:
    raw = _strip(os.environ.get(key, ""))
    if not raw:
        raw = fallback
    raw = raw.rstrip("/")
    if raw.endswith("/api/v1") or raw.endswith("/api"):
        return raw
    # Admin service uses /api (no v1); others use /api/v1
    if key in {"ADMIN_SERVICE_URL", "ADMIN_BASE_URL"}:
        return f"{raw}/api"
    return f"{raw}/api/v1"


API_BASE_URL = _strip(os.environ.get("API_BASE_URL", "")).rstrip("/")
USE_GATEWAY = bool(API_BASE_URL)

SERVICE_BASES: dict[str, str] = {
    "auth": _env_url("AUTH_SERVICE_URL", _env_url("AUTH_BASE_URL", "http://127.0.0.1:3001")),
    "blog": _env_url("BLOG_SERVICE_URL", _env_url("BLOG_BASE_URL", "http://127.0.0.1:3014")),
    "portfolio": _env_url("PORTFOLIO_SERVICE_URL", "http://127.0.0.1:3013"),
    "admin": _env_url("ADMIN_SERVICE_URL", _env_url("ADMIN_BASE_URL", "http://127.0.0.1:3005")),
    "quotes": _env_url("QUOTES_SERVICE_URL", "http://127.0.0.1:3007"),
    "requests": _env_url("REQUESTS_SERVICE_URL", "http://127.0.0.1:3006"),
    "notifications": _env_url(
        "NOTIFICATIONS_SERVICE_URL",
        _env_url("NOTIFICATION_SERVICE_URL", "http://127.0.0.1:3011"),
    ),
    "media": _env_url("MEDIA_SERVICE_URL", _env_url("MEDIA_BASE_URL", "http://127.0.0.1:3012")),
    "users": _env_url("USERS_SERVICE_URL", "http://127.0.0.1:3002"),
    "payments": _env_url("PAYMENTS_SERVICE_URL", "http://127.0.0.1:3003"),
}

# Prefer direct service calls for seeding reliability (admin expects x-user-* headers).
DIRECT_PREFERRED = frozenset(SERVICE_BASES.keys())

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nestlancer.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "REDACTED_DEMO_PASSWORD")
ADMIN_ORIGIN = (
    _strip(os.environ.get("ADMIN_URL", ""))
    or _strip(os.environ.get("SEED_ADMIN_ORIGIN", ""))
    or "https://admin.nestlancer.com"
)
CLIENT_ORIGIN = (
    _strip(os.environ.get("FRONTEND_URL", ""))
    or _strip(os.environ.get("WEB_URL", ""))
    or _strip(os.environ.get("SEED_CLIENT_ORIGIN", ""))
    or "https://app.nestlancer.com"
)
SEED_BYPASS_TOKEN = _strip(
    os.environ.get("SEED_BYPASS_TOKEN", "")
    or os.environ.get("TURNSTILE_BYPASS_TOKEN", "")
)


def log(msg: str) -> None:
    print(f"[seed] {msg}")


def warn(msg: str) -> None:
    print(f"[warn] {msg}", file=sys.stderr)


def fail(msg: str) -> None:
    print(f"[fail] {msg}", file=sys.stderr)
    sys.exit(1)


def service_base(service: str) -> str:
    if service not in SERVICE_BASES and not (USE_GATEWAY and service not in DIRECT_PREFERRED):
        fail(f"Unknown service: {service}")
    # When API_BASE_URL is set (remote prod/dev seeding), route everything through
    # the public gateway. Infisical *_SERVICE_URL values are localhost and only
    # work when the seed runs on the app VPS.
    if USE_GATEWAY and API_BASE_URL:
        return API_BASE_URL
    if service in SERVICE_BASES:
        return SERVICE_BASES[service]
    return API_BASE_URL


def _normalize_path(service: str, path: str) -> str:
    """Map direct-service paths onto gateway-mounted routes when needed."""
    if not path.startswith("/"):
        path = f"/{path}"
    if not (USE_GATEWAY and API_BASE_URL):
        return path
    # Direct admin service serves /api/system/*; gateway mounts /api/v1/admin/system/*
    if service == "admin" and path.startswith("/system/"):
        return f"/admin{path}"
    # Direct blog service serves /api/v1/posts; gateway mounts /api/v1/blog/posts
    if service == "blog" and (
        path == "/posts"
        or path.startswith("/posts?")
        or path.startswith("/posts/")
    ):
        return f"/blog{path}"
    return path


def _admin_forward_headers(token: str | None) -> dict[str, str]:
    """Admin service AdminGuard trusts gateway headers when JWT is not decoded locally."""
    headers: dict[str, str] = {}
    if not token:
        return headers
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload_b64))
        headers["x-user-role"] = str(claims.get("role") or "ADMIN")
        if claims.get("sub"):
            headers["x-user-id"] = str(claims["sub"])
        if claims.get("email"):
            headers["x-user-email"] = str(claims["email"])
    except Exception:
        headers["x-user-role"] = "ADMIN"
    return headers


def request_json(
    method: str,
    path: str,
    *,
    service: str,
    token: str | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = 60,
    retries: int = 3,
    ok_statuses: set[int] | None = None,
) -> dict[str, Any]:
    """Perform an HTTP JSON request with retries. Returns parsed JSON body."""
    ok_statuses = ok_statuses or {200, 201}
    path = _normalize_path(service, path)
    base = service_base(service)
    url = f"{base}{path}" if path.startswith("/") else f"{base}/{path}"

    last_error = ""
    for attempt in range(1, retries + 1):
        headers = {
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        }
        if SEED_BYPASS_TOKEN:
            headers["x-nestlancer-seed-token"] = SEED_BYPASS_TOKEN
        # Portal-bound auth: Origin + optional body.portal must match admin/client.
        if path.rstrip("/").endswith("/auth/login") or path.endswith("/auth/login"):
            portal = None
            if isinstance(body, dict):
                portal = body.get("portal")
            origin = ADMIN_ORIGIN if portal == "admin" else CLIENT_ORIGIN
            headers["Origin"] = origin
            headers["Referer"] = f"{origin.rstrip('/')}/login"
        data: bytes | None = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode()
        if token:
            headers["Authorization"] = f"Bearer {token}"
            headers.update(_admin_forward_headers(token))

        req = Request(url, data=data, headers=headers, method=method.upper())
        try:
            with urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode()
                payload = json.loads(raw) if raw else {}
                if resp.status not in ok_statuses:
                    last_error = f"{method} {path} -> HTTP {resp.status}: {raw[:300]}"
                else:
                    # Normalize bare JSON arrays/scalars into the standard envelope
                    # so unwrap() can peel them (portfolio admin list endpoints).
                    if isinstance(payload, dict):
                        return payload
                    return {"status": "success", "data": payload}
        except HTTPError as exc:
            raw = exc.read().decode()
            try:
                payload = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                payload = {"raw": raw[:400]}
            # Treat successful business payloads with odd status as usable when status=success
            if isinstance(payload, dict) and payload.get("status") == "success":
                return payload
            last_error = f"{method} {path} -> HTTP {exc.code}: {raw[:400]}"
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = f"{method} {path} -> {exc}"

        if attempt < retries:
            warn(f"{last_error} (retry {attempt}/{retries})")
            time.sleep(attempt * 1.5)

    fail(last_error or f"{method} {path} failed")


def unwrap(payload: Any) -> Any:
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


class AdminApiClient:
    """Authenticated admin API session for seeding."""

    # Prod JWT_ACCESS_EXPIRY is 15m — refresh before expiry during long seeds.
    TOKEN_REFRESH_SECONDS = 600

    def __init__(self) -> None:
        self.token: str | None = None
        self.user_id: str | None = None
        self.email = ADMIN_EMAIL
        self._token_refreshed_at = 0.0

    def try_login(self, *, email: str | None = None, password: str | None = None) -> bool:
        """Attempt admin login; return False on failure without exiting."""
        email = email or ADMIN_EMAIL
        password = password or ADMIN_PASSWORD
        if not password:
            return False
        try:
            body: dict[str, Any] = {
                "email": email,
                "password": password,
                "portal": "admin",
            }
            # Auth TurnstileService accepts TURNSTILE_BYPASS_TOKEN as the token value.
            if SEED_BYPASS_TOKEN:
                body["turnstileToken"] = SEED_BYPASS_TOKEN
            resp = request_json(
                "POST",
                "/auth/login",
                service="auth",
                body=body,
                retries=2,
            )
        except SystemExit:
            return False
        if resp.get("status") != "success":
            return False
        data = unwrap(resp)
        self.token = data.get("accessToken") or (data.get("tokens") or {}).get("accessToken")
        user = data.get("user") or {}
        self.user_id = user.get("id")
        self.email = user.get("email") or email
        if self.token:
            self._token_refreshed_at = time.time()
        return bool(self.token)

    def login(self, *, email: str | None = None, password: str | None = None) -> None:
        email = email or ADMIN_EMAIL
        password = password or ADMIN_PASSWORD
        if not password:
            fail("ADMIN_PASSWORD is not set")
        log(f"Logging in as {email} ...")
        if not self.try_login(email=email, password=password):
            fail(f"Login failed for {email}")
        log(f"Authenticated (user id: {self.user_id})")

    def ensure_token(self, *, force: bool = False) -> str:
        """Refresh admin JWT when stale so long blog/portfolio seeds survive 15m expiry."""
        stale = (
            not self.token
            or force
            or (time.time() - self._token_refreshed_at >= self.TOKEN_REFRESH_SECONDS)
        )
        if stale:
            if not self.try_login(email=self.email):
                fail("Admin re-login failed during seed — check ADMIN_PASSWORD")
            log("Refreshed admin session token")
        assert self.token
        return self.token

    def get(self, path: str, *, service: str) -> dict[str, Any]:
        return request_json("GET", path, service=service, token=self.ensure_token())

    def post(self, path: str, *, service: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        return request_json("POST", path, service=service, token=self.ensure_token(), body=body)

    def patch(self, path: str, *, service: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        return request_json("PATCH", path, service=service, token=self.ensure_token(), body=body)

    def put_bytes(self, url: str, content: bytes, content_type: str, *, retries: int = 3) -> int:
        # Keep the public host. The URL is signed for that host, and Cloudflare
        # rejects the seed user-agent (error 1010) before MinIO sees the request.
        last = 0
        for attempt in range(1, retries + 1):
            req = Request(
                url,
                data=content,
                headers={"Content-Type": content_type, "User-Agent": PRESIGNED_PUT_USER_AGENT},
                method="PUT",
            )
            try:
                with urlopen(req, timeout=120) as resp:
                    last = resp.status
                    if last == 200:
                        return last
            except HTTPError as exc:
                last = exc.code
            if attempt < retries:
                warn(f"Storage PUT returned {last}, retrying ({attempt}/{retries}) ...")
                time.sleep(attempt * 2)
        return last

    def post_multipart(
        self,
        path: str,
        *,
        service: str,
        field_name: str,
        file_path: Path,
        query: str = "",
    ) -> dict[str, Any]:
        """POST a multipart file upload (e.g. portfolio media/upload)."""
        import mimetypes

        path = _normalize_path(service, path)
        if query:
            path = f"{path}?{query.lstrip('?')}"
        base = service_base(service)
        url = f"{base}{path}" if path.startswith("/") else f"{base}/{path}"

        mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        boundary = "----NestlancerSeedBoundary7MA4YWxk"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_path.name}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode() + file_path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()

        token = self.ensure_token()
        headers = {
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {token}",
        }
        headers.update(_admin_forward_headers(token))

        last_error = ""
        for attempt in range(1, 6):
            req = Request(url, data=body, headers=headers, method="POST")
            try:
                with urlopen(req, timeout=120) as resp:
                    raw = resp.read().decode()
                    return json.loads(raw) if raw else {}
            except HTTPError as exc:
                raw = exc.read().decode()
                last_error = f"POST multipart {path} -> HTTP {exc.code}: {raw[:400]}"
                # Replica lag can 404 a row created milliseconds earlier.
                if exc.code in {404, 409, 500, 502, 503} and attempt < 5:
                    warn(f"{last_error} (retry {attempt}/5)")
                    time.sleep(attempt)
                    continue
                fail(last_error)
        fail(last_error or f"POST multipart {path} failed")
        return {}


def load_json(relative: str) -> Any:
    path = DATA_DIR / relative
    if not path.exists():
        fail(f"Missing seed data file: {path}")
    return json.loads(path.read_text())
