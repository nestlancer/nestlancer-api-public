#!/usr/bin/env python3
"""Step 2 — seed admin↔client scenarios via the real API.

Reads interaction files from data/scenarios/users/{seedKey}/ and executes each
step in order (see docs/seeding/ADMIN-CLIENT-COMPLETE-FLOW-endpoints.md).

Requires:
  - seeded-users.json from scripts/create_accounts.py
  - generated assets from scripts/generate_assets.py

Usage:
    python3 prod-data/user-admin-interaction/scripts/seed_scenarios.py
    python3 prod-data/user-admin-interaction/scripts/seed_scenarios.py --workers 5
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from lib.admin_queue import AdminTaskQueue
from lib.scenario_loader import (
    iter_scenario_users,
    load_accounts_index,
    load_scenarios_index,
    load_user_scenario,
)
from lib.api_client import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    CLIENT_PASSWORD,
    DATABASE_URL,
    admin_milestone_request_payment_path,
    curl_json,
    fail,
    future_valid_until,
    http_put_bytes,
    http_upload_file,
    load_seeded_users,
    log,
    login,
    replay_quote_accepted,
    service_base,
    unwrap_gateway_payload,
    warn,
)
from lib.paths import GENERATED_DIR

PROJECT_POLL_SECONDS = int(__import__("os").environ.get("PROJECT_POLL_SECONDS", "90"))


class SeedError(RuntimeError):
    """Recoverable seed failure inside a client thread."""


def seed_fail(msg: str) -> None:
    raise SeedError(msg)


def is_auth_error(resp: dict) -> bool:
    if not isinstance(resp, dict):
        return False
    err = resp.get("error") or {}
    code = err.get("code") if isinstance(err, dict) else ""
    message = str(err.get("message", "")) if isinstance(err, dict) else ""
    return code == "AUTH_001" or "authentication token" in message.lower()


_admin_ctx: AdminCtx | None = None
_admin_user_ids: dict[str, str] = {}
_resume_from_action: str | None = None
_seed_user_filter: set[str] | None = None
_seeded_by_email: dict[str, dict] = {}
_seed_errors: list[str] = []
_errors_lock = threading.Lock()


class AdminCtx:
    """Admin token + serialized task queue (one worker thread)."""

    TOKEN_REFRESH_SECONDS = 600

    def __init__(self, token: str, queue: AdminTaskQueue) -> None:
        self.token = token
        self.queue = queue
        self._token_refreshed_at = time.time()
        self._lock = threading.Lock()

    def ensure_token(self, *, force: bool = False) -> str:
        with self._lock:
            stale = time.time() - self._token_refreshed_at >= self.TOKEN_REFRESH_SECONDS
            if force or stale:
                new_token, _ = login(ADMIN_EMAIL, ADMIN_PASSWORD)
                if not new_token:
                    seed_fail("Admin re-login failed during seed — check ADMIN_PASSWORD")
                self.token = new_token
                self._token_refreshed_at = time.time()
                log("Refreshed admin session token")
            return self.token

    def run(self, label: str, fn: Callable[[str], Any], timeout: float = 300) -> Any:
        return self.queue.run(label, lambda: fn(self.ensure_token()), timeout=timeout)


def record_error(msg: str) -> None:
    with _errors_lock:
        _seed_errors.append(msg)
    warn(msg)


def curl_upload_file(
    path: str,
    url: str,
    token: str,
    field_name: str = "file",
    service: str = "requests",
) -> dict:
    base = service_base(service)
    full_url = f"{base}{url}"
    return http_upload_file(Path(path), full_url, token, field_name=field_name)


def ensure_client_session(profile: dict, password: str) -> tuple[str, str]:
    email = profile["email"].lower()
    seeded = _seeded_by_email.get(email)
    if not seeded:
        seed_fail(f"No seeded account for {email} — run scripts/create_accounts.py first")

    token, live_id = login(email, password)
    if not token:
        seed_fail(f"Login failed for {email} — check password in seeded-users.json")

    if live_id != seeded["userId"]:
        seed_fail(
            f"User id drift for {email}: seeded={seeded['userId']} live={live_id} "
            "— re-run create_accounts.py or restore seeded user ids before seeding scenarios"
        )

    log(f"  logged in {email} ({live_id})")
    return token, live_id


def suppress_email_delivery(client_token: str, user_def: dict) -> None:
    prefs = user_def.get("notificationPreferences")
    if not prefs:
        prefs = {
            "preferences": {
                cat: {"email": False, "push": False, "inApp": True}
                for cat in ["PROJECT", "QUOTE", "PAYMENT", "MESSAGE", "SYSTEM"]
            }
        }
    resp = curl_json(
        "PATCH", "/notifications/preferences",
        token=client_token, body=prefs, service="notifications", allow_error=True,
    )
    if resp.get("status") == "success":
        log(f"  email/push notifications disabled for {user_def['profile']['email']}")
    else:
        warn(f"Could not disable email notifications: {json.dumps(resp)}")


def resolve_admin_id_direct(token: str, email: str) -> str | None:
    if email in _admin_user_ids:
        return _admin_user_ids[email]
    resp = curl_json(
        "GET", f"/admin/users/search?email={email}",
        token=token, service="users", allow_error=True,
    )
    items = resp.get("data", {}).get("items") or resp.get("data", [])
    if isinstance(items, list) and items:
        uid = items[0].get("id")
        if uid:
            _admin_user_ids[email] = uid
            return uid
    return None


def resolve_admin_id(admin: AdminCtx, email: str) -> str | None:
    if email in _admin_user_ids:
        return _admin_user_ids[email]
    uid = admin.run(f"resolve admin id {email}", lambda t: resolve_admin_id_direct(t, email))
    if uid:
        return uid
    token, found = login(email, ADMIN_PASSWORD)
    if found:
        _admin_user_ids[email] = found
        return found
    return None


def asset_path(user_dir: Path, rel: str) -> Path:
    path = GENERATED_DIR / "users" / user_dir.name / rel
    if not path.exists():
        seed_fail(f"Asset not found: {path} — run scripts/generate_assets.py first")
    return path


def media_display_name(file_path: Path) -> str:
    """Unique, project-scoped filename so the admin media library is not a pile of quote-proposal.pdf."""
    parts = file_path.parts
    stem = file_path.stem
    try:
        users_i = parts.index("users")
        owner = parts[users_i + 1]
        project = parts[users_i + 3] if users_i + 3 < len(parts) and parts[users_i + 2] == "projects" else ""
        prefix = f"{owner}-{project}" if project else owner
        stem = f"{prefix}-{file_path.stem}"
    except (ValueError, IndexError):
        stem = file_path.stem
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-")
    return f"{safe}{file_path.suffix.lower()}"


def upload_media(token: str, file_path: Path, *, retries: int = 5) -> str:
    display_name = media_display_name(file_path)
    mime = mimetypes.guess_type(display_name)[0] or "application/octet-stream"
    size = file_path.stat().st_size
    if mime.startswith("image/"):
        file_type = "IMAGE"
    elif file_path.suffix.lower() in {".zip", ".tar", ".gz", ".tgz"} or mime in {
        "application/zip", "application/x-tar", "application/gzip",
    }:
        file_type = "ARCHIVE"
    else:
        file_type = "DOCUMENT"

    last_err = ""
    for attempt in range(1, retries + 1):
        req_resp = curl_json(
            "POST", "/media/upload/request", token=token,
            body={"filename": display_name, "mimeType": mime, "size": size, "fileType": file_type},
            service="media", allow_error=True,
        )
        if req_resp.get("status") == "error":
            last_err = json.dumps(req_resp.get("error", req_resp))[:500]
            if is_auth_error(req_resp) and _admin_ctx is not None:
                token = _admin_ctx.ensure_token(force=True)
                if attempt < retries:
                    warn(f"Media upload auth expired for {file_path.name} — refreshed admin token (retry {attempt}/{retries})")
                    time.sleep(1)
                    continue
            if attempt < retries:
                warn(f"Media upload request failed for {file_path.name} (retry {attempt}/{retries}): {last_err}")
                time.sleep(min(2 ** attempt, 10))
                continue
            seed_fail(f"Media upload request failed for {file_path.name}: {last_err}")

        data = unwrap_gateway_payload(req_resp)
        if not isinstance(data, dict) or not data.get("mediaId") or not data.get("uploadUrl"):
            last_err = json.dumps(req_resp)[:500]
            if attempt < retries:
                warn(f"Media upload response missing mediaId for {file_path.name} (retry {attempt}/{retries})")
                time.sleep(min(2 ** attempt, 10))
                continue
            seed_fail(f"Media upload response missing mediaId for {file_path.name}: {last_err}")

        media_id = data["mediaId"]
        upload_url = data["uploadUrl"]

        status_code = http_put_bytes(upload_url, file_path.read_bytes(), mime)
        if status_code != 200:
            last_err = f"Storage PUT failed ({status_code})"
            if attempt < retries:
                warn(f"{last_err} for {file_path.name} (retry {attempt}/{retries})")
                time.sleep(min(2 ** attempt, 10))
                continue
            seed_fail(f"Storage PUT failed ({status_code}) for {file_path.name}")

        confirm_resp = curl_json(
            "POST", "/media/upload/confirm", token=token,
            body={"uploadId": media_id}, service="media", allow_error=True,
        )
        if confirm_resp.get("status") == "error":
            last_err = json.dumps(confirm_resp.get("error", confirm_resp))[:500]
            if attempt < retries:
                warn(f"Media upload confirm failed for {file_path.name} (retry {attempt}/{retries}): {last_err}")
                time.sleep(min(2 ** attempt, 10))
                continue
            seed_fail(f"Media upload confirm failed for {file_path.name}: {last_err}")

        for _ in range(30):
            time.sleep(1)
            detail = curl_json("GET", f"/media/{media_id}", token=token, service="media", allow_error=True)
            detail_data = unwrap_gateway_payload(detail)
            status = detail_data.get("status", "") if isinstance(detail_data, dict) else ""
            if status in {"READY", "PROCESSING", "FAILED"}:
                break

        log(f"  uploaded media {file_path.name} -> {media_id}")
        return media_id

    seed_fail(f"Media upload failed for {file_path.name}: {last_err}")


def find_by_title(items: list[dict], title: str) -> dict | None:
    return next((i for i in items if i.get("title") == title), None)


def extract_paginated_list(resp: dict) -> list[dict]:
    data = resp.get("data", {})
    if isinstance(data, list):
        return data
    if isinstance(data.get("data"), list):
        return data["data"]
    if isinstance(data.get("items"), list):
        return data["items"]
    return []


def fetch_admin_requests_direct(token: str, user_id: str | None = None) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        query = f"/admin/requests?limit=100&page={page}&status=all"
        if user_id:
            query += f"&userId={user_id}"
        batch = extract_paginated_list(curl_json("GET", query, token=token, service="requests"))
        if not batch:
            break
        items.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return items


def fetch_admin_requests(admin: AdminCtx, user_id: str | None = None) -> list[dict]:
    label = f"list requests user={user_id or 'all'}"
    return admin.run(label, lambda t: fetch_admin_requests_direct(t, user_id))


def fetch_admin_quotes_direct(token: str, user_id: str | None = None) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        query = f"/admin/quotes?limit=100&page={page}&status=all"
        if user_id:
            query += f"&userId={user_id}"
        batch = extract_paginated_list(curl_json("GET", query, token=token, service="quotes"))
        if not batch:
            break
        items.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return items


def fetch_admin_quotes(admin: AdminCtx, user_id: str | None = None) -> list[dict]:
    label = f"list quotes user={user_id or 'all'}"
    return admin.run(label, lambda t: fetch_admin_quotes_direct(t, user_id))


def run_admin_request_action(admin: AdminCtx, request_id: str, step: dict) -> None:
    action = step["action"]

    def _do(token: str) -> None:
        if action == "updateStatus":
            curl_json(
                "PATCH", f"/admin/requests/{request_id}/status", token=token,
                body={"status": step["status"], "notes": step.get("notes")},
                service="requests", allow_error=True,
            )
            log(f"  request status -> {step['status']}")
        elif action == "addNote":
            curl_json(
                "POST", f"/admin/requests/{request_id}/notes", token=token,
                body={"content": step["content"]}, service="requests", allow_error=True,
            )
            log("  admin note added")
        elif action == "assign":
            assignee_id = resolve_admin_id_direct(token, step["assigneeEmail"])
            if assignee_id:
                curl_json(
                    "POST", f"/admin/requests/{request_id}/assign", token=token,
                    body={"assigneeId": assignee_id}, service="requests", allow_error=True,
                )
                log(f"  assigned to {step['assigneeEmail']}")
        else:
            warn(f"Unknown request admin action: {action}")

    admin.run(f"request {request_id} {action}", _do)


def ensure_request(
    user_dir: Path,
    client_token: str,
    admin: AdminCtx,
    client_id: str,
    req_def: dict,
    request_ids: dict[str, str],
) -> str:
    key = req_def["seedKey"]
    title = req_def["create"]["title"]
    if key in request_ids:
        return request_ids[key]

    existing = find_by_title(fetch_admin_requests(admin, client_id), title)
    if existing:
        request_ids[key] = existing["id"]
        warn(f"Request exists, skipping create: {title}")
        return existing["id"]

    created = curl_json("POST", "/requests", token=client_token, body=req_def["create"], service="requests")
    if created.get("status") != "success":
        seed_fail(f"Create request failed for {key}: {json.dumps(created)}")
    request_id = created["data"]["id"]
    request_ids[key] = request_id
    log(f"  created request: {title}")

    for rel in req_def.get("attachments", []):
        fpath = asset_path(user_dir, rel)
        up = curl_upload_file(str(fpath), f"/requests/{request_id}/attachments", client_token)
        if up.get("status") == "success":
            log(f"  attached to request: {fpath.name}")
        else:
            warn(f"Request attachment failed: {json.dumps(up)}")

    if req_def.get("submit"):
        curl_json(
            "POST", f"/requests/{request_id}/submit", token=client_token,
            body={"confirmComplete": True}, service="requests",
        )

    for step in req_def.get("adminWorkflow", []):
        run_admin_request_action(admin, request_id, step)

    return request_id


def run_quote_user_action(client_token: str, quote_id: str, action_def: dict) -> None:
    action = action_def["action"]
    path = {"accept": "accept", "decline": "decline", "requestChanges": "request-changes"}[action]
    resp = curl_json(
        "POST", f"/quotes/{quote_id}/{path}", token=client_token,
        body=action_def.get("payload", {}), service="quotes", allow_error=True,
    )
    if resp.get("status") == "success":
        log(f"  client quote action: {action}")
    else:
        warn(f"Quote action {action} failed: {json.dumps(resp)}")


def mark_request_quoted_direct(token: str, request_id: str) -> None:
    curl_json(
        "PATCH", f"/admin/requests/{request_id}/status", token=token,
        body={"status": "quoted", "notes": "Quote sent to client"},
        service="requests", allow_error=True,
    )


def mark_request_quoted(admin: AdminCtx, request_id: str) -> None:
    def _mark(token: str) -> None:
        mark_request_quoted_direct(token, request_id)

    admin.run(f"request {request_id} → quoted", _mark)


def run_quote_workflow_step(
    user_dir: Path,
    admin: AdminCtx,
    client_token: str,
    quote_id: str,
    request_id: str,
    step: dict,
) -> None:
    action = step["action"]
    actor = step.get("actor")

    if actor == "client":
        run_quote_user_action(client_token, quote_id, step)
        return

    def _do(token: str) -> None:
        if action == "sendQuote":
            curl_json("POST", f"/admin/quotes/{quote_id}/send", token=token, service="quotes")
            log("  sent quote to client")
            mark_request_quoted_direct(token, request_id)
        elif action == "resendQuote":
            curl_json("POST", f"/admin/quotes/{quote_id}/send", token=token, service="quotes")
            log("  resent quote to client")
        elif action == "reviseQuote":
            body = dict(step.get("payload", {}))
            if "validUntil" not in body:
                body["validUntil"] = future_valid_until()
            curl_json(
                "POST", f"/admin/quotes/{quote_id}/revise", token=token,
                body=body, service="quotes", allow_error=True,
            )
            log("  revised quote")
        elif action == "updateRequestStatus":
            payload = step.get("payload", {})
            curl_json(
                "PATCH", f"/admin/requests/{request_id}/status", token=token,
                body=payload, service="requests", allow_error=True,
            )
            log(f"  request status -> {payload.get('status')}")
        elif action == "uploadQuoteAttachments":
            for rel in step.get("files", []):
                upload_media(token, asset_path(user_dir, rel))
        else:
            warn(f"Unknown quote workflow action: {action}")

    admin.run(f"quote {quote_id} {action}", _do)


def ensure_quote(
    user_dir: Path,
    admin: AdminCtx,
    client_token: str,
    client_id: str,
    quote_def: dict,
    request_ids: dict[str, str],
    quote_ids: dict[str, str],
) -> str:
    key = quote_def["seedKey"]
    workflow = quote_def.get("workflow") or []
    if key in quote_ids and not workflow:
        return quote_ids[key]

    request_id = request_ids[quote_def["requestSeedKey"]]
    parent_key = quote_def.get("parentQuoteSeedKey")
    if parent_key and parent_key in quote_ids:
        quote_id = quote_ids[parent_key]
    else:
        quote_id = None

    admin_quotes = fetch_admin_quotes(admin, client_id)
    existing = next((q for q in admin_quotes if q.get("requestId") == request_id), None)

    if not existing and not quote_id:
        def _lookup_quote(token: str) -> dict | None:
            req_detail = curl_json(
                "GET", f"/admin/requests/{request_id}", token=token,
                service="requests", allow_error=True,
            )
            req_data = req_detail.get("data") or {}
            quote_from_req = req_data.get("quote")
            if not quote_from_req:
                quotes = req_data.get("quotes") or []
                if quotes:
                    quote_from_req = quotes[0]
            return quote_from_req if quote_from_req and quote_from_req.get("id") else None

        existing = admin.run(f"lookup quote for request {request_id}", _lookup_quote)

    if not quote_id:
        quote_id = existing["id"] if existing else None

    if not quote_id and quote_def.get("create"):
        for rel in quote_def.get("attachmentFiles", []):
            admin.run(
                f"upload quote attachment {Path(rel).name}",
                lambda t, p=asset_path(user_dir, rel): upload_media(t, p),
            )

        create_body = quote_def["create"]
        payload: dict[str, Any] = {
            "items": create_body["items"],
            "currency": create_body["currency"],
            "taxPercentage": create_body.get("taxPercentage", 0),
            "validUntil": future_valid_until(),
            "requiresContract": create_body.get("requiresContract", False),
            "revisionsIncluded": create_body.get("revisionsIncluded", 2),
        }
        if create_body.get("schedulePreset"):
            payload["schedulePreset"] = create_body["schedulePreset"]
        if create_body.get("paymentSchedule"):
            payload["paymentSchedule"] = create_body["paymentSchedule"]
        if create_body.get("internalNotes"):
            payload["internalNotes"] = create_body["internalNotes"]
        if create_body.get("termsAndConditions"):
            payload["termsAndConditions"] = create_body["termsAndConditions"]
        if create_body.get("prefillFromPackage"):
            payload["prefillFromPackage"] = create_body["prefillFromPackage"]

        def _create_quote(token: str) -> str:
            created = curl_json(
                "POST", f"/admin/requests/{request_id}/quotes",
                token=token, body=payload, service="requests", allow_error=True,
            )
            if created.get("status") != "success":
                err = created.get("error", {})
                if err.get("code") == "REQUEST_006":
                    req_detail = curl_json(
                        "GET", f"/admin/requests/{request_id}", token=token,
                        service="requests", allow_error=True,
                    )
                    quotes = (req_detail.get("data") or {}).get("quotes") or []
                    if quotes:
                        warn(f"Quote already exists for request {request_id}")
                        return quotes[0]["id"]
                seed_fail(f"Create quote failed: {json.dumps(created)}")
            new_id = created["data"]["id"]
            log(f"  created quote for request {request_id}")
            return new_id

        quote_id = admin.run(f"create quote for request {request_id}", _create_quote)
    elif quote_id:
        warn(f"Quote exists for request {request_id}")

    if not quote_id:
        seed_fail(f"No quote id for {key}")

    quote_ids[key] = quote_id

    if workflow:
        for step in workflow:
            run_quote_workflow_step(
                user_dir, admin, client_token, quote_id, request_id, step,
            )
    else:
        if quote_def.get("send"):
            admin.run(
                f"send quote {quote_id}",
                lambda t: curl_json("POST", f"/admin/quotes/{quote_id}/send", token=t, service="quotes"),
            )
            log("  sent quote to client")
            mark_request_quoted(admin, request_id)
        if quote_def.get("userAction"):
            run_quote_user_action(client_token, quote_id, quote_def["userAction"])

    return quote_id


def wait_for_project(
    admin: AdminCtx,
    client_token: str,
    client_id: str,
    quote_id: str,
    request_id: str | None = None,
) -> str | None:
    deadline = time.time() + PROJECT_POLL_SECONDS
    replayed = False

    def _db_lookup() -> str | None:
        if not DATABASE_URL:
            return None
        result = subprocess.run(
            [
                "psql", DATABASE_URL, "-t", "-A", "-c",
                f"SELECT id FROM \"Project\" WHERE \"quoteId\" = '{quote_id}' LIMIT 1;",
            ],
            capture_output=True,
            text=True,
        )
        pid = result.stdout.strip()
        return pid or None

    # Prefer DB when available — admin list omits quoteId; archived projects 404 by-quote.
    found = _db_lookup()
    if found:
        return found

    while time.time() < deadline:
        by_quote = curl_json(
            "GET", f"/projects/by-quote/{quote_id}", token=client_token,
            service="projects", allow_error=True,
        )
        if by_quote.get("status") == "success":
            data = by_quote.get("data") or {}
            project_id = data.get("id") or data.get("projectId")
            if project_id:
                return project_id

        def _admin_lookup(token: str) -> str | None:
            admin_projects = curl_json(
                "GET", "/admin/projects?limit=50", token=token,
                service="projects", allow_error=True,
            )
            for item in extract_paginated_list(admin_projects):
                if item.get("quoteId") == quote_id and item.get("clientId") == client_id:
                    return item["id"]
            return _db_lookup()

        found = admin.run(f"poll project for quote {quote_id}", _admin_lookup)
        if found:
            return found

        if not replayed and request_id and time.time() > deadline - PROJECT_POLL_SECONDS / 2:
            if replay_quote_accepted(quote_id, request_id, client_id):
                replayed = True
                deadline = time.time() + 60
        time.sleep(2)

    warn(f"Project not found for quote {quote_id}")
    return None


def fetch_project_milestones_direct(token: str, project_id: str) -> list[dict]:
    resp = curl_json(
        "GET", f"/admin/projects/{project_id}", token=token,
        service="projects", allow_error=True,
    )
    return resp.get("data", {}).get("milestones", []) or []


def fetch_project_milestones(admin: AdminCtx, project_id: str) -> list[dict]:
    return admin.run(
        f"milestones project {project_id}",
        lambda t: fetch_project_milestones_direct(t, project_id),
    )


_SCHEDULE_PAYMENT_NAME = re.compile(
    r"(?i)^(deposit|full payment|mid[- ]?project payment|final payment|milestone \d+|payment \d+)\b"
)


def is_schedule_payment_milestone(milestone: dict) -> bool:
    """Payment-schedule rows from quote — not delivery work milestones."""
    name = str(milestone.get("name") or "").strip()
    if _SCHEDULE_PAYMENT_NAME.match(name):
        return True
    pct = milestone.get("percentage")
    if pct is not None:
        try:
            if float(pct) > 0:
                return True
        except (TypeError, ValueError):
            pass
    return False


def _project_has_started_workflow(admin: AdminCtx, project_id: str) -> bool:
    """True when seed workflow progressed beyond auto-created payment schedule rows."""
    if fetch_project_payments(admin, project_id):
        return True
    if fetch_project_deliverables(admin, project_id):
        return True
    milestones = fetch_project_milestones(admin, project_id)
    work_milestones = [m for m in milestones if not is_schedule_payment_milestone(m)]
    return bool(work_milestones)


def _project_workflow_fully_seeded(admin: AdminCtx, project_id: str) -> bool:
    """True when a prior seed run already completed this project's workflow."""
    milestones = fetch_project_milestones(admin, project_id)
    if not milestones:
        return False
    work = [
        m for m in milestones
        if not is_schedule_payment_milestone(m) and str(m.get("name") or "").strip().lower() != "project delivery"
    ]
    if not work:
        return False
    if any(str(m.get("status") or "").upper() not in ("COMPLETED", "APPROVED") for m in work):
        return False
    deliverables = fetch_project_deliverables(admin, project_id)
    if not deliverables:
        return False
    if any(str(d.get("status") or "").upper() != "APPROVED" for d in deliverables):
        return False
    return True


def is_deposit_milestone(milestone: dict) -> bool:
    return bool(re.match(r"(?i)^deposit\b", str(milestone.get("name") or "").strip()))


def sorted_milestones(milestones: list[dict]) -> list[dict]:
    return sorted(
        milestones,
        key=lambda m: (
            int(m.get("order") or 0),
            str(m.get("createdAt") or m.get("id") or ""),
        ),
    )


def resolve_milestone(milestones: list[dict], step: dict) -> dict | None:
    """
    Resolve a milestone for a seed step.

    Prefer ``milestoneName``. Otherwise:
    - ``milestoneKind: "deposit"`` → deposit schedule row
    - ``milestoneKind: "payment"`` → Nth post-deposit installment (1-based ``milestoneOrder``)
    - default / ``milestoneKind: "work"`` → Nth work (non-schedule) milestone
    """
    if not milestones:
        return None

    name = step.get("milestoneName")
    if name:
        needle = str(name).strip().lower()
        for m in milestones:
            if str(m.get("name") or "").strip().lower() == needle:
                return m
        for m in milestones:
            if needle in str(m.get("name") or "").strip().lower():
                return m
        return None

    kind = str(step.get("milestoneKind") or "work").strip().lower()
    order = int(step.get("milestoneOrder") or 1)
    sorted_ms = sorted_milestones(milestones)

    if kind == "deposit":
        for m in sorted_ms:
            if is_deposit_milestone(m):
                return m
        return sorted_ms[0] if sorted_ms else None

    if kind in ("payment", "schedule"):
        schedule = [
            m for m in sorted_ms
            if is_schedule_payment_milestone(m) and not is_deposit_milestone(m)
        ]
        idx = order - 1
        return schedule[idx] if 0 <= idx < len(schedule) else None

    # work — skip payment-schedule rows so order 1 is the first delivery milestone
    work = [m for m in sorted_ms if not is_schedule_payment_milestone(m)]
    has_real_work = any(
        str(m.get("name") or "").strip().lower() != "project delivery" or (m.get("amount") or 0) > 0
        for m in work
    )
    if has_real_work:
        work = [
            m for m in work
            if str(m.get("name") or "").strip().lower() != "project delivery" or (m.get("amount") or 0) > 0
        ]
    pool = work if work else sorted_ms
    idx = order - 1
    return pool[idx] if 0 <= idx < len(pool) else None


def milestone_by_order(milestones: list[dict], order: int) -> dict | None:
    """Backward-compatible: Nth work milestone (skips Deposit / Mid / Final)."""
    return resolve_milestone(milestones, {"milestoneOrder": order, "milestoneKind": "work"})


def fetch_project_payments_direct(token: str, project_id: str) -> list[dict]:
    resp = curl_json(
        "GET", f"/admin/payments?projectId={project_id}&limit=50",
        token=token, service="payments", allow_error=True,
    )
    return extract_paginated_list(resp)


def fetch_project_payments(admin: AdminCtx, project_id: str) -> list[dict]:
    return admin.run(
        f"payments project {project_id}",
        lambda t: fetch_project_payments_direct(t, project_id),
    )


def fetch_project_deliverables_direct(token: str, project_id: str) -> list[dict]:
    resp = curl_json(
        "GET", f"/admin/projects/{project_id}/deliverables",
        token=token, service="progress", allow_error=True,
    )
    return resp.get("data", []) or []


def fetch_project_deliverables(admin: AdminCtx, project_id: str) -> list[dict]:
    return admin.run(
        f"deliverables project {project_id}",
        lambda t: fetch_project_deliverables_direct(t, project_id),
    )


def run_project_admin_action(
    user_dir: Path,
    admin: AdminCtx,
    client_id: str,
    project_id: str,
    step: dict,
    payment_ids: list[str],
    deliverable_ids: list[str],
) -> None:
    action = step["action"]

    def _do(token: str) -> None:
        if action == "updateStatus":
            payload = step.get("payload") or {}
            status = step.get("status") or payload.get("status")
            curl_json(
                "PATCH", f"/admin/projects/{project_id}/status", token=token,
                body={
                    "status": status,
                    "reason": step.get("reason") or payload.get("reason"),
                    "notifyClient": step.get("notifyClient", payload.get("notifyClient", False)),
                },
                service="projects", allow_error=True,
            )
            log(f"  project status -> {status}")

        elif action == "createMilestones":
            existing = fetch_project_milestones_direct(token, project_id)
            existing_names = {
                str(m.get("name") or "").strip().lower()
                for m in existing
                if str(m.get("name") or "").strip()
            }
            for ms in step["milestones"]:
                name_key = str(ms.get("name") or "").strip().lower()
                if name_key and name_key in existing_names:
                    log(f"  milestone exists, skip: {ms['name']}")
                    continue
                curl_json(
                    "POST", f"/admin/projects/{project_id}/milestones", token=token,
                    body=ms, service="progress", allow_error=True,
                )
                if name_key:
                    existing_names.add(name_key)
                log(f"  milestone: {ms['name']}")

        elif action == "uploadDeliverable":
            milestones = fetch_project_milestones_direct(token, project_id)
            ms = resolve_milestone(milestones, step)
            if not ms:
                warn(f"Milestone not found for deliverable step (order={step.get('milestoneOrder')} name={step.get('milestoneName')})")
                return
            # Skip when this milestone already has a deliverable (NL-DATA-002).
            # Use direct fetch — nested admin.run deadlocks the single-thread admin queue.
            existing_deliverables = fetch_project_deliverables_direct(token, project_id) or []
            ms_id = str(ms.get("id") or "")
            already = [
                d for d in existing_deliverables
                if str(d.get("milestoneId") or "") == ms_id
            ]
            if already:
                log(f"  deliverable exists, skip → {ms.get('name')}")
                for d in already:
                    did = d.get("id")
                    if did and did not in deliverable_ids:
                        deliverable_ids.append(did)
            else:
                media_ids = [
                    upload_media(token, asset_path(user_dir, rel)) for rel in step["files"]
                ]
                resp = curl_json(
                    "POST", f"/admin/projects/{project_id}/deliverables", token=token,
                    body={"milestoneId": ms["id"], "mediaIds": media_ids,
                          "description": step.get("description", "")},
                    service="progress", allow_error=True,
                )
                if resp.get("status") == "success":
                    did = resp.get("data", {}).get("id")
                    if did:
                        deliverable_ids.append(did)
                    log(f"  deliverable uploaded ({len(media_ids)} files) → {ms.get('name')}")

        elif action == "completeMilestone":
            milestones = fetch_project_milestones_direct(token, project_id)
            ms = resolve_milestone(milestones, step)
            if ms:
                if is_schedule_payment_milestone(ms):
                    warn(f"Skipping complete on pay-only schedule milestone {ms.get('name')}")
                    return
                if str(ms.get("status") or "").upper() in ("COMPLETED", "APPROVED"):
                    log(f"  milestone already completed/approved, skip: {ms.get('name')}")
                    return
                curl_json(
                    "POST", f"/admin/milestones/{ms['id']}/complete", token=token,
                    service="progress", allow_error=True,
                )
                log(f"  milestone completed: {ms.get('name')}")

        elif action == "createProgressEntry":
            milestones = fetch_project_milestones_direct(token, project_id)
            payload = dict(step["payload"])
            if step.get("milestoneOrder") or step.get("milestoneName") or step.get("milestoneKind"):
                ms = resolve_milestone(milestones, step)
                if ms:
                    payload["milestoneId"] = ms["id"]
            for rel in step.get("attachmentFiles", []):
                mid = upload_media(token, asset_path(user_dir, rel))
                payload.setdefault("attachmentIds", []).append(mid)
            curl_json(
                "POST", f"/admin/progress/projects/{project_id}", token=token,
                body=payload, service="progress", allow_error=True,
            )
            log(f"  progress: {payload.get('title', '')}")

        elif action == "createManualPayment":
            milestones = fetch_project_milestones_direct(token, project_id)
            body = dict(step["payload"])
            body["projectId"] = project_id
            body["clientId"] = client_id
            target_name = None
            milestone_amount = None
            if step.get("milestoneOrder") or step.get("milestoneName") or step.get("milestoneKind"):
                ms = resolve_milestone(milestones, step)
                if ms:
                    body["milestoneId"] = ms["id"]
                    target_name = ms.get("name")
                    milestone_amount = int(ms.get("amount") or 0)
                    log(f"  payment target: {target_name}")
            # Schedule rows are the ledger. A hardcoded seed amount that is not the
            # installment (quote/3, pre-revision total, rupees) must not be written.
            if milestone_amount and milestone_amount > 0:
                payload_amount = body.get("amount")
                if payload_amount is None:
                    body["amount"] = milestone_amount
                elif int(payload_amount) != milestone_amount:
                    seed_fail(
                        f"Manual payment {payload_amount} paise does not match "
                        f"milestone {target_name or body.get('milestoneId')} "
                        f"amount {milestone_amount} paise. "
                        "Seed payloads must use the quote schedule installment."
                    )
            resp = curl_json(
                "POST", "/admin/payments/manual", token=token,
                body=body, service="payments", allow_error=True,
            )
            data = resp.get("data") if isinstance(resp.get("data"), dict) else {}
            pid = data.get("id") or data.get("paymentId")
            if pid and resp.get("status") == "success":
                payment_ids.append(pid)
                suffix = f" → {target_name}" if target_name else ""
                log(f"  payment: {body.get('amount')} paise{suffix}")
            else:
                err = resp.get("error") or data.get("error") or resp
                # Idempotent seed: duplicate COMPLETED payment is now rejected (PAYMENT_GATE_003).
                if isinstance(err, dict) and err.get("code") == "PAYMENT_GATE_003":
                    existing = [
                        p for p in fetch_project_payments_direct(token, project_id)
                        if str(p.get("milestoneId") or "") == str(body.get("milestoneId") or "")
                        and str(p.get("status") or "").upper() == "COMPLETED"
                    ]
                    if milestone_amount and existing and int(existing[0].get("amount") or 0) != milestone_amount:
                        seed_fail(
                            f"Existing payment {existing[0].get('amount')} paise does not match "
                            f"milestone {target_name} amount {milestone_amount} paise. "
                            "Reset and reseed — do not leave a short payment on a larger installment."
                        )
                    warn(
                        f"  payment already recorded for {target_name or body.get('milestoneId')} — continuing"
                    )
                    return
                seed_fail(f"createManualPayment failed ({body.get('amount')} paise): {err}")

        elif action == "requestMilestonePayment":
            milestones = fetch_project_milestones_direct(token, project_id)
            ms = resolve_milestone(milestones, step)
            if not ms:
                seed_fail(
                    "Milestone not found for request-payment "
                    f"(order={step.get('milestoneOrder')} name={step.get('milestoneName')})"
                )
            if is_deposit_milestone(ms):
                warn(f"Skipping request-payment on deposit {ms.get('name')}")
                return
            if not is_schedule_payment_milestone(ms):
                seed_fail(
                    f"request-payment must target a schedule installment, got work milestone {ms.get('name')}"
                )
            resp = curl_json(
                "POST", admin_milestone_request_payment_path(ms["id"]),
                token=token, body={}, service="payments", allow_error=True,
            )
            if resp.get("status") == "success":
                log(f"  payment requested: {ms.get('name')}")
            else:
                err = resp.get("error") or resp.get("data", {}).get("error") or resp
                if isinstance(err, dict) and err.get("code") == "PAYMENT_GATE_003":
                    warn(f"  payment already recorded for {ms.get('name')} — continuing")
                    return
                seed_fail(f"request-payment failed for {ms.get('name')}: {err}")

        elif action == "processRefund":
            payments = payment_ids or [p["id"] for p in fetch_project_payments_direct(token, project_id)]
            idx = step.get("paymentIndex", -1)
            if not payments:
                warn("No payment to refund")
                return
            payment_id = payments[idx] if 0 <= idx < len(payments) else payments[-1]
            curl_json(
                "POST", f"/admin/payments/{payment_id}/refund", token=token,
                body=step.get("payload", {}), service="payments", allow_error=True,
            )
            log(f"  refund on payment {payment_id}")

        elif action == "createTimeEntry":
            milestones = fetch_project_milestones_direct(token, project_id)
            body = dict(step["payload"])
            body["projectId"] = project_id
            if step.get("milestoneOrder") or step.get("milestoneName") or step.get("milestoneKind"):
                ms = resolve_milestone(milestones, step)
                if ms:
                    body["milestoneId"] = ms["id"]
            curl_json(
                "POST", "/admin/time-entries", token=token,
                body=body, service="progress", allow_error=True,
            )
            log(f"  time entry: {body.get('durationMinutes')} min")

        elif action == "archiveProject":
            curl_json(
                "POST", f"/admin/projects/{project_id}/archive", token=token,
                service="projects", allow_error=True,
            )
            log("  project archived")

        else:
            warn(f"Unknown project admin action: {action}")

    admin.run(f"project {project_id} {action}", _do)


def send_project_messages(
    user_dir: Path,
    admin: AdminCtx,
    client_token: str,
    project_id: str,
    messages: list[dict],
) -> None:
    for msg in messages:
        if msg["sender"] == "admin":
            def _send(token: str, m=msg) -> None:
                body: dict[str, Any] = {"content": m["content"], "type": m.get("type", "TEXT")}
                if m.get("file"):
                    body["mediaId"] = upload_media(token, asset_path(user_dir, m["file"]))
                    body["type"] = "FILE"
                curl_json(
                    "POST", f"/messages/projects/{project_id}", token=token,
                    body=body, service="messaging", allow_error=True,
                )

            admin.run(f"project message (admin) {project_id}", _send)
        else:
            body: dict[str, Any] = {"content": msg["content"], "type": msg.get("type", "TEXT")}
            if msg.get("file"):
                body["mediaId"] = upload_media(client_token, asset_path(user_dir, msg["file"]))
                body["type"] = "FILE"
            curl_json(
                "POST", f"/messages/projects/{project_id}", token=client_token,
                body=body, service="messaging", allow_error=True,
            )


def send_final_delivery(
    user_dir: Path,
    admin: AdminCtx,
    project_id: str,
    final: dict,
) -> None:
    def _send(token: str) -> None:
        for rel in final.get("files", []):
            mid = upload_media(token, asset_path(user_dir, rel))
            curl_json(
                "POST", f"/messages/projects/{project_id}", token=token,
                body={"content": f"Attached: {Path(rel).name}", "type": "FILE", "mediaId": mid},
                service="messaging", allow_error=True,
            )
        if final.get("message"):
            curl_json(
                "POST", f"/messages/projects/{project_id}", token=token,
                body={"content": final["message"], "type": "TEXT"},
                service="messaging", allow_error=True,
            )
        log(f"  final delivery sent ({len(final.get('files', []))} files)")

    admin.run(f"final delivery project {project_id}", _send)


def run_project_user_actions(
    client_token: str,
    admin: AdminCtx,
    project_id: str,
    milestones: list[dict],
    actions: list[dict],
) -> None:
    deliverables = fetch_project_deliverables(admin, project_id)
    for act in actions:
        action = act["action"]
        if action == "approveMilestone":
            ms = resolve_milestone(milestones, act)
            if not ms:
                warn(
                    f"Milestone not found for approve "
                    f"(order={act.get('milestoneOrder')} name={act.get('milestoneName')})"
                )
                continue
            if is_schedule_payment_milestone(ms):
                warn(f"Skipping approve on pay-only schedule milestone {ms.get('name')}")
                continue
            if str(ms.get("status") or "").upper() == "APPROVED":
                log(f"  milestone already approved, skip: {ms.get('name')}")
                continue
            curl_json(
                "POST", f"/milestones/{ms['id']}/approve", token=client_token,
                body=act.get("payload", {}), service="progress", allow_error=True,
            )
            log(f"  client approved milestone: {ms.get('name')}")
        elif action == "approveDeliverable":
            idx = act.get("deliverableIndex", 0)
            if deliverables and idx < len(deliverables):
                d = deliverables[idx]
                if str(d.get("status") or "").upper() == "APPROVED":
                    log(f"  deliverable already approved, skip: {d.get('name')}")
                    continue
                curl_json(
                    "POST", f"/deliverables/{d['id']}/approve",
                    token=client_token, body=act.get("payload", {}),
                    service="progress", allow_error=True,
                )
                log("  client approved deliverable")
        elif action == "submitFeedback":
            curl_json(
                "POST", f"/projects/{project_id}/feedback", token=client_token,
                body=act["payload"], service="projects", allow_error=True,
            )
            log("  client feedback submitted")
        elif action == "approveProject":
            resp = curl_json(
                "POST", f"/projects/{project_id}/approve", token=client_token,
                body=act["payload"], service="projects", allow_error=True,
            )
            if resp.get("status") == "error" or (isinstance(resp.get("error"), dict) and resp.get("status") != "success"):
                warn(f"  project approve failed: {resp}")
            else:
                log("  client approved project")
        elif action == "requestProjectRevision":
            curl_json(
                "POST", f"/projects/{project_id}/request-revision", token=client_token,
                body=act["payload"], service="projects", allow_error=True,
            )
            log("  client requested project revision")
        elif action == "requestRevision":
            ms = resolve_milestone(milestones, act)
            if not ms:
                warn(
                    f"Milestone not found for revision "
                    f"(order={act.get('milestoneOrder')} name={act.get('milestoneName')})"
                )
                continue
            curl_json(
                "POST", f"/milestones/{ms['id']}/request-revision", token=client_token,
                body=act.get("payload", {}), service="progress", allow_error=True,
            )
            log(f"  client requested milestone revision: {ms.get('name')}")
        elif action == "rejectDeliverable":
            idx = act.get("deliverableIndex", 0)
            deliverables = fetch_project_deliverables(admin, project_id)
            if deliverables and idx < len(deliverables):
                curl_json(
                    "POST", f"/deliverables/{deliverables[idx]['id']}/reject",
                    token=client_token, body=act.get("payload", {}),
                    service="progress", allow_error=True,
                )
                log("  client rejected deliverable")
        elif action == "signContract":
            curl_json(
                "POST", f"/projects/{project_id}/sign-contract", token=client_token,
                body=act.get("payload", {}), service="projects", allow_error=True,
            )
            log("  client signed contract")


def ensure_project(
    user_dir: Path,
    admin: AdminCtx,
    client_token: str,
    client_id: str,
    project_def: dict,
    quote_ids: dict[str, str],
    project_ids: dict[str, str],
    quote_to_request: dict[str, str],
) -> None:
    payment_ids: list[str] = []
    deliverable_ids: list[str] = []

    key = project_def["seedKey"]
    if key in project_ids:
        return

    quote_key = project_def["quoteSeedKey"]
    quote_id = quote_ids[quote_key]
    request_id = quote_to_request.get(quote_key)
    project_id = wait_for_project(
        admin, client_token, client_id, quote_id, request_id=request_id,
    )
    if not project_id:
        return

    project_ids[key] = project_id
    log(f"  project ready: {key} ({project_id})")

    workflow = project_def.get("workflow")
    if workflow:
        # NL-DATA-002: skip full workflow only when a prior run already produced
        # deliverables/payments. Work milestones alone are not enough (partial runs).
        if not _resume_from_action and _project_workflow_fully_seeded(admin, project_id):
            log(f"  skip workflow (already seeded): {key}")
            return
        resume_gate_open = not (
            _resume_from_action
            and _project_has_started_workflow(admin, project_id)
        )
        for step in workflow:
            action = step.get("action")
            actor = step.get("actor")
            if _resume_from_action and not resume_gate_open:
                if action == _resume_from_action:
                    resume_gate_open = True
                else:
                    continue
            if action == "projectMessaging":
                send_project_messages(
                    user_dir, admin, client_token, project_id, step.get("messages") or [],
                )
            elif action == "finalDelivery":
                send_final_delivery(user_dir, admin, project_id, step)
            elif actor == "admin":
                run_project_admin_action(
                    user_dir, admin, client_id, project_id, step, payment_ids, deliverable_ids,
                )
            elif actor == "client":
                milestones = fetch_project_milestones(admin, project_id)
                run_project_user_actions(
                    client_token, admin, project_id, milestones, [step],
                )
            elif actor == "both":
                if action == "projectMessaging":
                    send_project_messages(
                        user_dir, admin, client_token, project_id, step.get("messages") or [],
                    )
                else:
                    warn(f"Unknown both-actor workflow step: {action}")
            else:
                warn(f"Unknown workflow step actor/action: {actor}/{action}")
        return

    # Legacy path: adminWorkflow then userActions (does not preserve interleaving)
    for step in project_def.get("adminWorkflow", []):
        run_project_admin_action(
            user_dir, admin, client_id, project_id, step, payment_ids, deliverable_ids,
        )

    if project_def.get("messages"):
        send_project_messages(user_dir, admin, client_token, project_id, project_def["messages"])

    milestones = fetch_project_milestones(admin, project_id)
    if project_def.get("userActions"):
        run_project_user_actions(
            client_token, admin, project_id, milestones, project_def["userActions"],
        )

    if project_def.get("finalDelivery"):
        send_final_delivery(user_dir, admin, project_id, project_def["finalDelivery"])


def send_notifications(admin: AdminCtx, client_id: str, notifications: list[dict]) -> None:
    for note in notifications:
        channels = note.get("channels", ["IN_APP"])
        if "EMAIL" in channels:
            warn("Stripping EMAIL channel — seed policy suppresses outbound email")
            channels = [c for c in channels if c != "EMAIL"]

        def _send(token: str, n=note, ch=channels) -> None:
            curl_json(
                "POST", "/admin/notifications/send", token=token,
                body={"recipientIds": [client_id], "title": n["title"], "message": n["message"],
                      "type": n.get("type"), "channels": ch or ["IN_APP"]},
                service="notifications", allow_error=True,
            )

        admin.run(f"notification to {client_id}: {note['title']}", _send)


def seed_direct_messages(
    user_dir: Path,
    admin: AdminCtx,
    client_token: str,
    messages: list[dict],
) -> None:
    thread_resp = curl_json(
        "POST", "/messages/threads/direct", token=client_token,
        body={}, service="messaging", allow_error=True,
    )
    thread_id = (thread_resp.get("data") or {}).get("id") or (thread_resp.get("data") or {}).get("threadId")
    if not thread_id:
        warn("Could not create direct message thread")
        return

    for msg in messages:
        if msg["sender"] == "admin":
            def _send(token: str, m=msg) -> None:
                body: dict[str, Any] = {"content": m["content"], "type": "TEXT"}
                if m.get("file"):
                    body["mediaId"] = upload_media(token, asset_path(user_dir, m["file"]))
                    body["type"] = "FILE"
                curl_json(
                    "POST", f"/messages/threads/{thread_id}/messages", token=token,
                    body=body, service="messaging", allow_error=True,
                )

            admin.run(f"direct message (admin) thread {thread_id}", _send)
        else:
            body: dict[str, Any] = {"content": msg["content"], "type": "TEXT"}
            if msg.get("file"):
                body["mediaId"] = upload_media(client_token, asset_path(user_dir, msg["file"]))
                body["type"] = "FILE"
            curl_json(
                "POST", f"/messages/threads/{thread_id}/messages", token=client_token,
                body=body, service="messaging", allow_error=True,
            )


def resolve_user_id_by_email(admin: AdminCtx, email: str) -> str | None:
    normalized = email.lower()
    cached = _seeded_by_email.get(normalized)
    if cached and cached.get("id"):
        return cached["id"]

    def _lookup(token: str) -> str | None:
        resp = curl_json(
            "GET", f"/admin/users/search?q={normalized}",
            token=token, service="users", allow_error=True,
        )
        data = resp.get("data")
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("items") or data.get("data") or []
        else:
            items = []
        if items:
            return items[0].get("id")
        return None

    return admin.run(f"resolve user id {email}", _lookup)


def seed_group_messages(
    user_dir: Path,
    admin: AdminCtx,
    group_def: dict,
) -> None:
    client_ids: list[str] = []
    for email in group_def.get("memberEmails", []):
        uid = resolve_user_id_by_email(admin, email.lower())
        if uid and uid not in client_ids:
            client_ids.append(uid)
    if len(client_ids) < 2:
        warn(f"Group thread needs 2+ clients; got {len(client_ids)} for {group_def.get('title')}")
        return

    title = group_def.get("title", "Group conversation")
    member_fingerprint = ",".join(sorted(client_ids))

    def _find_existing(token: str) -> str | None:
        # NL-MSG-004: reuse an existing GROUP with same title + membership.
        resp = curl_json(
            "GET", "/messages/conversations?limit=100",
            token=token, service="messaging", allow_error=True,
        )
        data = resp.get("data")
        items = []
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("items") or data.get("data") or []
        needle = str(title).strip().lower()
        for item in items:
            if not isinstance(item, dict):
                continue
            if str(item.get("kind") or "").upper() != "THREAD":
                continue
            if str(item.get("threadType") or "").upper() != "GROUP":
                continue
            if str(item.get("title") or "").strip().lower() != needle:
                continue
            participants = item.get("participantIds") or []
            if isinstance(participants, list):
                fp = ",".join(sorted(str(p) for p in participants if p))
                # Allow match when client set is a subset of thread members (admin also present).
                if member_fingerprint and all(cid in fp.split(",") for cid in client_ids):
                    return item.get("threadId") or item.get("id")
        return None

    reused_existing = {"value": False}

    def _create(token: str) -> str | None:
        existing = _find_existing(token)
        if existing:
            reused_existing["value"] = True
            log(f"  group thread exists, reuse: {title}")
            return existing
        resp = curl_json(
            "POST", "/messages/threads/group", token=token,
            body={"title": title, "clientUserIds": client_ids},
            service="messaging", allow_error=True,
        )
        data = resp.get("data") or {}
        return data.get("id") or data.get("threadId")

    thread_id = admin.run(f"group thread {title}", _create)
    if not thread_id:
        warn("Could not create group message thread")
        return

    def _verify_members(token: str) -> None:
        curl_json(
            "GET", f"/messages/threads/{thread_id}/members", token=token,
            service="messaging", allow_error=True,
        )

    admin.run(f"group members {thread_id}", _verify_members)

    if reused_existing["value"]:
        log(f"  skip group messages (thread already seeded): {title}")
        return

    for msg in group_def.get("messages", []):
        if msg["sender"] == "admin":
            def _send(token: str, m=msg) -> None:
                body: dict[str, Any] = {"content": m["content"], "type": "TEXT"}
                if m.get("file"):
                    body["mediaId"] = upload_media(token, asset_path(user_dir, m["file"]))
                    body["type"] = "FILE"
                curl_json(
                    "POST", f"/messages/threads/{thread_id}/messages", token=token,
                    body=body, service="messaging", allow_error=True,
                )

            admin.run(f"group message (admin) thread {thread_id}", _send)
        else:
            sender_email = msg.get("senderEmail", "").lower()
            sender_id = resolve_user_id_by_email(admin, sender_email) if sender_email else None
            if not sender_id:
                warn(f"Could not resolve sender for group message: {sender_email}")
                continue
            token_resp = login(sender_email, CLIENT_PASSWORD)
            if not token_resp[0]:
                warn(f"Could not login group message sender {sender_email}")
                continue
            sender_token = token_resp[0]
            body: dict[str, Any] = {"content": msg["content"], "type": "TEXT"}
            if msg.get("file"):
                body["mediaId"] = upload_media(sender_token, asset_path(user_dir, msg["file"]))
                body["type"] = "FILE"
            curl_json(
                "POST", f"/messages/threads/{thread_id}/messages", token=sender_token,
                body=body, service="messaging", allow_error=True,
            )


def seed_user(
    admin: AdminCtx,
    uc_entry: dict,
    flow_dir: Path,
    default_password: str,
) -> None:
    user_def = load_user_scenario(flow_dir, uc_entry["seedKey"])
    user_dir = flow_dir

    log(f"=== {user_def['seedKey']}: {user_def['scenario']} ===")

    email = user_def["profile"]["email"].lower()
    seeded = _seeded_by_email.get(email)
    password = (seeded or {}).get("password") or user_def["profile"].get("password", default_password)
    client_token, client_id = ensure_client_session(user_def["profile"], password)
    suppress_email_delivery(client_token, user_def)

    request_ids: dict[str, str] = {}
    quote_ids: dict[str, str] = {}
    project_ids: dict[str, str] = {}

    for req_def in user_def.get("requests", []):
        ensure_request(user_dir, client_token, admin, client_id, req_def, request_ids)

    for quote_def in user_def.get("quotes", []):
        ensure_quote(user_dir, admin, client_token, client_id, quote_def, request_ids, quote_ids)

    quote_to_request = {
        q["seedKey"]: request_ids[q["requestSeedKey"]]
        for q in user_def.get("quotes", [])
        if q["seedKey"] in quote_ids and q["requestSeedKey"] in request_ids
    }

    for project_def in user_def.get("projects", []):
        if project_def.get("waitForAutoCreate"):
            time.sleep(3)
        ensure_project(
            user_dir, admin, client_token, client_id, project_def,
            quote_ids, project_ids, quote_to_request,
        )

    if user_def.get("directMessages"):
        seed_direct_messages(user_dir, admin, client_token, user_def["directMessages"])

    if user_def.get("groupMessages"):
        seed_group_messages(user_dir, admin, user_def["groupMessages"])

    if user_def.get("notifications"):
        send_notifications(admin, client_id, user_def["notifications"])


def seed_user_safe(
    admin: AdminCtx,
    uc_entry: dict,
    flow_dir: Path,
    default_password: str,
) -> None:
    seed_key = uc_entry.get("seedKey", "?")
    try:
        seed_user(admin, uc_entry, flow_dir, default_password)
        log(f"=== done: {seed_key} ===")
    except Exception as exc:
        record_error(f"{seed_key} failed: {exc}")
        import traceback
        traceback.print_exc()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed user–admin interactions (concurrent clients)")
    parser.add_argument(
        "--workers", type=int, default=1,
        help="Client threads (default: 1 — serialized with single admin queue)",
    )
    parser.add_argument(
        "--users",
        help="Comma-separated seedKey list (default: all scenario users)",
    )
    parser.add_argument(
        "--from-action",
        help="Skip workflow steps until this action on in-progress projects (e.g. requestMilestonePayment)",
    )
    args = parser.parse_args()

    global _resume_from_action, _seed_user_filter
    if args.from_action:
        _resume_from_action = args.from_action.strip()
    if args.users:
        _seed_user_filter = {u.strip() for u in args.users.split(",") if u.strip()}

    if not ADMIN_PASSWORD:
        fail("ADMIN_PASSWORD is not set")

    seeded_data = load_seeded_users()
    global _seeded_by_email
    _seeded_by_email = {u["email"].lower(): u for u in seeded_data["users"]}

    uc_index = load_accounts_index()
    af_index = load_scenarios_index()
    default_password = uc_index.get("meta", {}).get("defaultClientPassword") or CLIENT_PASSWORD
    if not default_password:
        fail("CLIENT_PASSWORD is required for scenario seeding")

    suppress = uc_index.get("meta", {}).get("suppressOutboundEmail")
    if suppress is None:
        suppress = af_index.get("meta", {}).get("suppressOutboundEmail", True)
    if suppress:
        log("Email suppression ON — no outbound emails will be sent to seed accounts")

    admin_token, _ = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        fail("Admin login failed")

    admin_queue = AdminTaskQueue()
    admin_queue.start()
    admin = AdminCtx(admin_token, admin_queue)
    global _admin_ctx
    _admin_ctx = admin

    flow_users = iter_scenario_users()
    if _seed_user_filter:
        flow_users = [
            entry for entry in flow_users
            if entry[0].get("seedKey") in _seed_user_filter
        ]
        if not flow_users:
            fail(f"No scenario users matched --users={args.users}")
    if _resume_from_action:
        log(f"Resume mode — skipping workflow steps until action: {_resume_from_action}")
    workers = min(max(1, args.workers), len(flow_users))
    log(
        f"Step 2 — seeding {len(flow_users)} user flows "
        f"({workers} client thread(s), 1 admin queue) ..."
    )

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [
                pool.submit(seed_user_safe, admin, uc_entry, flow_dir, default_password)
                for uc_entry, _flow_entry, flow_dir in flow_users
            ]
            for future in as_completed(futures):
                future.result()
    finally:
        admin_queue.shutdown()

    if _seed_errors:
        fail(f"Step 2 finished with {len(_seed_errors)} error(s) — see warnings above")

    log("Step 2 complete.")


if __name__ == "__main__":
    main()
