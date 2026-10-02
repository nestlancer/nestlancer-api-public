#!/usr/bin/env python3
"""API-driven platform baseline seed (replaces init/scripts/core_seed.py SQL upserts).

Posts taxonomy / core / commerce JSON from prod-data/data/ to admin REST endpoints.
Requires Docker microservices. Admin user is bootstrapped via SQL only when login fails
(chicken-and-egg: APIs need an ADMIN to exist).
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

SEED_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SEED_DIR))

from lib.api_client import (  # noqa: E402
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    DATA_DIR,
    AdminApiClient,
    fail,
    load_json,
    log,
    service_base,
    unwrap,
    warn,
)


def sync_admin_display_name(client: AdminApiClient, meta: dict | None = None) -> None:
    """Keep the operator profile professional in messages, blog bylines, and settings."""
    meta = meta or load_json("core/admin.json")
    first_name = os.environ.get("ADMIN_FIRST_NAME", meta.get("firstName", "Riya")).strip()
    last_name = os.environ.get("ADMIN_LAST_NAME", meta.get("lastName", "Kapoor")).strip()
    if not first_name or not last_name:
        return
    body: dict[str, Any] = {"firstName": first_name, "lastName": last_name}
    for key in ("phone", "headline", "bio"):
        value = str(meta.get(key) or "").strip()
        if value:
            body[key] = value
    try:
        client.patch("/users/profile", service="users", body=body)
    except SystemExit:
        warn(f"Could not sync admin profile for {first_name} {last_name}")
        return
    log(f"  admin profile: {first_name} {last_name}")
    _upload_admin_avatar(client)


def _upload_admin_avatar(client: AdminApiClient) -> None:
    import requests

    avatar = DATA_DIR / "core" / "admin-avatar.jpg"
    if not avatar.exists() or not client.token:
        if not avatar.exists():
            warn(f"Admin avatar missing: {avatar}")
        return
    url = f"{service_base('users')}/users/avatar"
    headers = {"Authorization": f"Bearer {client.token}"}
    try:
        with avatar.open("rb") as handle:
            resp = requests.post(
                url,
                headers=headers,
                files={"file": (avatar.name, handle, "image/jpeg")},
                timeout=60,
            )
    except requests.RequestException as exc:
        warn(f"Admin avatar upload failed: {exc}")
        return
    if resp.status_code >= 400:
        warn(f"Admin avatar upload failed: HTTP {resp.status_code} {resp.text[:180]}")
        return
    log("  admin avatar uploaded")


def bootstrap_admin_if_needed(client: AdminApiClient) -> None:
    """Ensure an admin exists, then login."""
    log(f"Logging in as {ADMIN_EMAIL} ...")
    if client.try_login():
        log(f"Authenticated (user id: {client.user_id})")
        sync_admin_display_name(client)
        return

    warn("Admin login failed — bootstrapping admin user via database (one-time)")
    from lib.common import DATABASE_URL, hash_password_bcrypt, psql_exec, psql_scalar

    if not DATABASE_URL:
        fail("DATABASE_URL required to bootstrap admin when login fails")

    meta = load_json("core/admin.json")
    email = os.environ.get("ADMIN_EMAIL", meta.get("email", ADMIN_EMAIL)).strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", ADMIN_PASSWORD)
    first_name = os.environ.get("ADMIN_FIRST_NAME", meta.get("firstName", "Admin")).strip()
    last_name = os.environ.get("ADMIN_LAST_NAME", meta.get("lastName", "User")).strip()
    if not password or len(password) < 8:
        fail("ADMIN_PASSWORD must be at least 8 characters")

    def esc(value: str) -> str:
        return value.replace("'", "''")

    existing = psql_scalar(
        f"SELECT id FROM \"User\" WHERE email = '{esc(email)}' AND \"deletedAt\" IS NULL LIMIT 1;"
    )
    if existing:
        psql_exec(
            f"""
UPDATE "User" SET
  role = 'ADMIN', status = 'ACTIVE', "emailVerified" = true,
  "firstName" = '{esc(first_name)}',
  "lastName" = '{esc(last_name)}',
  "updatedAt" = NOW()
WHERE id = '{existing}';
"""
        )
        log(f"  promoted existing user to ADMIN ({email})")
    else:
        password_hash = hash_password_bcrypt(password)
        psql_exec(
            f"""
INSERT INTO "User" (
  id, email, "passwordHash", "firstName", "lastName", role, status, "emailVerified",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  '{esc(email)}',
  '{esc(password_hash)}',
  '{esc(first_name)}',
  '{esc(last_name)}',
  'ADMIN', 'ACTIVE', true, NOW(), NOW()
);
"""
        )
        log(f"  created ADMIN user ({email})")

    client.login(email=email, password=password)
    sync_admin_display_name(client)


def seed_taxonomy(client: AdminApiClient) -> None:
    categories = load_json("taxonomy/categories.json")
    tags = load_json("taxonomy/tags.json")

    log("Seeding blog categories ...")
    for cat in categories.get("blog", []):
        client.post("/admin/blog/categories", service="blog", body=cat)
    log(f"  blog categories: {len(categories.get('blog', []))}")

    log("Seeding portfolio categories ...")
    for cat in categories.get("portfolio", []):
        client.post("/admin/portfolio/categories", service="portfolio", body=cat)
    log(f"  portfolio categories: {len(categories.get('portfolio', []))}")

    if categories.get("requestCategories"):
        log("Seeding request categories (system config) ...")
        client.patch(
            "/system/config",
            service="admin",
            body={
                "key": "request.categories",
                "value": categories["requestCategories"],
                "description": "Available project request categories",
            },
        )

    log("Seeding blog tags ...")
    for tag in tags.get("blog", []):
        client.post("/admin/blog/tags", service="blog", body=tag)
    log(f"  blog tags: {len(tags.get('blog', []))}")


def seed_core_config(client: AdminApiClient) -> None:
    log("Seeding system config ...")
    for cfg in load_json("core/system-config.json"):
        client.patch(
            "/system/config",
            service="admin",
            body={
                "key": cfg["key"],
                "value": cfg["value"],
                **({"description": cfg["description"]} if cfg.get("description") else {}),
            },
        )

    log("Seeding feature flags ...")
    for flag in load_json("core/feature-flags.json"):
        client.patch(
            f"/system/features/{flag['flag']}",
            service="admin",
            body={
                "enabled": bool(flag.get("enabled", False)),
                **({"description": flag["description"]} if flag.get("description") else {}),
                **(
                    {"rolloutPercentage": int(flag["rolloutPercentage"])}
                    if flag.get("rolloutPercentage") is not None
                    else {}
                ),
            },
        )

    log("Seeding email templates ...")
    for tpl in load_json("core/email-templates.json"):
        client.post("/system/email-templates", service="admin", body=tpl)

    log("Seeding notification templates ...")
    for tpl in load_json("core/notification-templates.json"):
        client.post("/admin/notifications/templates", service="notifications", body=tpl)

    log("Seeding admin capacity ...")
    capacity = load_json("core/admin-capacity.json")
    client.patch("/admin/requests/settings/capacity", service="requests", body=capacity)


def _is_blank_legal_profile(row: dict[str, Any]) -> bool:
    """True when a company-legal row exists but has no invoice branding fields."""
    for key in ("legalName", "tradeName", "gstin", "pan", "address"):
        if str(row.get(key) or "").strip():
            return False
    return True


def seed_commerce(client: AdminApiClient) -> None:
    log("Seeding quote line-item blocks ...")
    for block in load_json("commerce/quote-line-item-blocks.json"):
        # API expects major currency units
        unit = block.get("defaultUnitPrice")
        if unit is None and block.get("defaultUnitPricePaise") is not None:
            unit = int(block["defaultUnitPricePaise"]) / 100.0
        body = {
            "slug": block["slug"],
            "label": block["label"],
            "description": block["description"],
            "category": block["category"],
            "defaultUnitPrice": unit,
            "defaultQuantity": block.get("defaultQuantity", 1),
            "sortOrder": block.get("sortOrder", 0),
        }
        client.post("/admin/quotes/line-item-library", service="quotes", body=body)

    log("Seeding service packages ...")
    for pkg in load_json("commerce/service-packages.json"):
        client.post("/admin/service-packages", service="requests", body=pkg)

    # Settlement accounts + legal identity (invoice/receipt PDF + bank-transfer UI).
    log("Seeding platform payment accounts ...")
    existing_accounts = unwrap(
        client.get("/admin/payments/accounts", service="payments")
    )
    if isinstance(existing_accounts, dict):
        existing_accounts = (
            existing_accounts.get("items")
            or existing_accounts.get("data")
            or existing_accounts.get("accounts")
            or []
        )
    if not isinstance(existing_accounts, list):
        existing_accounts = []
    if existing_accounts:
        log(f"  platform payment accounts already present: {len(existing_accounts)}")
    else:
        for account in load_json("commerce/platform-payment-accounts.json"):
            client.post("/admin/payments/accounts", service="payments", body=account)
        log(
            f"  created platform payment accounts: "
            f"{len(load_json('commerce/platform-payment-accounts.json'))}"
        )

    log("Seeding company legal profiles ...")
    existing_legal = unwrap(
        client.get("/admin/payments/company-legal", service="payments")
    )
    if isinstance(existing_legal, dict):
        existing_legal = (
            existing_legal.get("items")
            or existing_legal.get("data")
            or existing_legal.get("profiles")
            or []
        )
    if not isinstance(existing_legal, list):
        existing_legal = []
    legal_payloads = load_json("commerce/company-legal.json")
    blank_primary = next(
        (row for row in existing_legal if row.get("isPrimary") and _is_blank_legal_profile(row)),
        None,
    )
    if blank_primary and legal_payloads:
        profile_id = blank_primary.get("id")
        client.patch(
            f"/admin/payments/company-legal/{profile_id}",
            service="payments",
            body=legal_payloads[0],
        )
        log(f"  filled blank primary company-legal profile ({profile_id})")
    elif existing_legal:
        log(f"  company legal profiles already present: {len(existing_legal)}")
    else:
        for profile in legal_payloads:
            client.post("/admin/payments/company-legal", service="payments", body=profile)
        log(f"  created company legal profiles: {len(legal_payloads)}")


def verify_core(client: AdminApiClient) -> None:
    log("Verifying core seed via API ...")
    blog_cats = unwrap(client.get("/admin/blog/categories", service="blog"))
    if isinstance(blog_cats, dict):
        blog_cats = blog_cats.get("items") or blog_cats.get("categories") or []
    packages = unwrap(client.get("/admin/service-packages", service="requests"))
    if isinstance(packages, dict):
        packages = packages.get("items") or packages.get("data") or []
    log(f"  blog categories visible: {len(blog_cats) if isinstance(blog_cats, list) else '?'}")
    log(f"  service packages visible: {len(packages) if isinstance(packages, list) else '?'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="API-driven core platform seed")
    parser.add_argument("--verify", action="store_true", help="Print API verification counts")
    args = parser.parse_args()

    log("=== Core seed (API-driven) ===")
    client = AdminApiClient()
    bootstrap_admin_if_needed(client)
    seed_taxonomy(client)
    seed_core_config(client)
    seed_commerce(client)
    if args.verify:
        verify_core(client)
    log("=== Core seed complete ===")


if __name__ == "__main__":
    main()
