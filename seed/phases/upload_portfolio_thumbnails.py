#!/usr/bin/env python3
"""Upload professional portfolio thumbnails via admin media upload (PUBLIC)."""
from __future__ import annotations

import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = os.environ.get("API_BASE_URL", "https://api.nestlancer.com/api/v1").rstrip("/")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nestlancer.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "REDACTED_DEMO_PASSWORD")
IMAGES = Path(
    os.environ.get(
        "PORTFOLIO_IMAGES",
        str(Path(__file__).resolve().parents[1] / "payloads" / "portfolio" / "images"),
    )
)


def request(method: str, path: str, token: str | None = None, data: bytes | None = None, headers: dict | None = None):
    url = path if path.startswith("http") else f"{API}{path}"
    hdrs = {"Accept": "application/json", "User-Agent": "nestlancer-portfolio-thumbs/1.0"}
    if headers:
        hdrs.update(headers)
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode()
        return resp.status, json.loads(raw) if raw else {}


def login() -> str:
    origin = os.environ.get("ADMIN_URL", "https://admin.nestlancer.com").rstrip("/")
    status, body = request(
        "POST",
        "/auth/login",
        data=json.dumps({"email": EMAIL, "password": PASSWORD, "portal": "admin"}).encode(),
        headers={
            "Content-Type": "application/json",
            "Origin": origin,
            "Referer": f"{origin}/login",
        },
    )
    if status != 200 or body.get("status") != "success":
        raise SystemExit(f"login failed: {body}")
    return body["data"]["accessToken"]


def multipart_file(field: str, path: Path) -> tuple[bytes, str]:
    boundary = "----NestlancerBoundary7MA4YWxkTrZu0gW"
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field}"; filename="{path.name}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode() + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def unwrap(body: dict):
    cur = body
    for _ in range(4):
        if isinstance(cur, dict) and cur.get("status") == "success" and "data" in cur:
            cur = cur["data"]
            continue
        break
    return cur


def main() -> None:
    token = login()
    _, listing = request("GET", "/admin/portfolio?limit=100", token=token)
    items = unwrap(listing).get("items") or []
    print(f"Found {len(items)} portfolio items")

    for item in items:
        slug = item["slug"]
        item_id = item["id"]
        image = IMAGES / f"{slug}.jpg"
        if not image.exists():
            print(f"SKIP missing image: {image.name}")
            continue
        body, content_type = multipart_file("file", image)
        path = f"/admin/portfolio/{item_id}/media/upload?setAsThumbnail=true&title={slug}"
        try:
            status, resp = request(
                "POST",
                path,
                token=token,
                data=body,
                headers={"Content-Type": content_type},
            )
        except urllib.error.HTTPError as exc:
            print(f"FAIL {slug}: HTTP {exc.code} {exc.read()[:200]}")
            continue
        data = unwrap(resp) if isinstance(resp, dict) else {}
        url = ""
        if isinstance(data, dict):
            url = str(data.get("url") or "")
            media = data.get("media") or {}
            if isinstance(media, dict) and not url:
                url = str(media.get("id") or "")
        print(f"OK {slug} HTTP {status} url={url[:90]}")

    print("\nVerifying public list ...")
    _, pub = request("GET", "/portfolio?limit=20")
    for it in unwrap(pub).get("items") or []:
        thumb = it.get("thumbnailUrl") or ""
        print(f"  {it.get('slug')}: {'YES' if thumb else 'NO'} {thumb[:80]}")


if __name__ == "__main__":
    main()
