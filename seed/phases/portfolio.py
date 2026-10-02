#!/usr/bin/env python3
"""Seed published portfolio items from prod-data/data/portfolio via the admin API.

Uploads thumbnails through the media service (S3/MinIO) and creates/publishes items.
Safe to re-run — existing slugs are skipped / ensured published.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lib.api_client import (  # noqa: E402
    DATA_DIR,
    AdminApiClient,
    fail,
    load_json,
    log,
    unwrap,
    warn,
)
from lib.ledger import file_sha256, record, unchanged  # noqa: E402

ITEMS_JSON = "portfolio/items.json"
IMAGES_ROOT = DATA_DIR / "portfolio"


def resolve_image_path(item: dict) -> Path:
    rel = item.get("imageLocal")
    if not rel:
        fail(f"Missing imageLocal for {item['slug']}")
    path = IMAGES_ROOT / rel
    if not path.exists() or path.stat().st_size == 0:
        fail(f"Thumbnail image not found: {path}")
    return path


def fetch_category_map(client: AdminApiClient) -> dict[str, str]:
    resp = client.get("/admin/portfolio/categories", service="portfolio")
    items = unwrap(resp)
    if isinstance(items, dict):
        items = (
            items.get("items")
            or items.get("categories")
            or items.get("data")
            or list(items.values())
        )
    # request_json may wrap a bare array as {"data": [...]}; list(values) then nests it.
    if isinstance(items, list) and items and isinstance(items[0], list):
        items = items[0]
    if not isinstance(items, list):
        items = []
    return {item["slug"]: item["id"] for item in items if isinstance(item, dict)}


def attach_public_thumbnail(api: AdminApiClient, item_id: str, slug: str, file_path: Path) -> None:
    """Upload via portfolio media endpoint so the asset is PUBLIC and set as thumbnail."""
    digest = file_sha256(file_path)
    if unchanged("portfolio-image", slug, digest):
        log(f"  thumbnail unchanged: {slug}")
        return
    resp = api.post_multipart(
        f"/admin/portfolio/{item_id}/media/upload",
        service="portfolio",
        field_name="file",
        file_path=file_path,
        query=f"setAsThumbnail=true&title={slug}",
    )
    data = unwrap(resp) if isinstance(resp, dict) else {}
    url = ""
    if isinstance(data, dict):
        url = str(data.get("url") or "")
    record("portfolio-image", slug, digest, url=url)
    log(f"  public thumbnail attached: {slug} {url[:80]}")


def fetch_existing_items(client: AdminApiClient) -> dict[str, dict]:
    by_slug: dict[str, dict] = {}
    page = 1
    while True:
        resp = client.get(f"/admin/portfolio?limit=100&page={page}", service="portfolio")
        data = unwrap(resp)
        items = data.get("items", []) if isinstance(data, dict) else []
        if not items:
            break
        for item in items:
            slug = item.get("slug")
            if slug:
                by_slug[slug] = item
        if len(items) < 100:
            break
        page += 1
    return by_slug


def ensure_published(client: AdminApiClient, slug: str, item: dict, featured: bool) -> None:
    item_id = item["id"]
    if item.get("status") != "PUBLISHED":
        published = client.post(f"/admin/portfolio/{item_id}/publish", service="portfolio", body={})
        if published.get("status") != "success":
            detail = unwrap(published) if isinstance(published, dict) else {}
            if not (isinstance(detail, dict) and detail.get("status") == "PUBLISHED"):
                fail(f"Publish failed for existing {slug}: {published}")
        log(f"  published existing draft: {slug}")
    else:
        log(f"  already published: {slug}")

    if featured and not item.get("featured"):
        client.post(f"/admin/portfolio/{item_id}/toggle-featured", service="portfolio", body={})
        log(f"  featured: {slug}")


def create_and_publish(
    api: AdminApiClient,
    category_id: str,
    item: dict,
    image_path: Path,
) -> None:
    slug = item["slug"]
    client_info = item.get("client") or {}
    payload = {
        "title": item["title"],
        "slug": slug,
        "shortDescription": item["shortDescription"],
        "fullDescription": item["fullDescription"],
        "contentFormat": item.get("contentFormat") or "MARKDOWN",
        "categoryId": category_id,
        "tags": item.get("tags") or [],
        "featured": bool(item.get("featured")),
        "client": client_info or None,
        # Flat fields keep older create mappers populated (industry/website/testimonial).
        "clientName": client_info.get("name"),
        "clientIndustry": client_info.get("industry"),
        "clientWebsite": client_info.get("website"),
        "clientTestimonial": client_info.get("testimonial"),
        "projectDetails": item.get("projectDetails"),
        "links": item.get("links"),
        "seo": item.get("seo"),
    }
    # Drop nullish nested objects so validation stays clean
    payload = {k: v for k, v in payload.items() if v is not None}

    created = api.post("/admin/portfolio", service="portfolio", body=payload)
    item_id = unwrap(created)["id"]
    log(f"  created draft: {slug} ({item_id})")

    attach_public_thumbnail(api, item_id, slug, image_path)

    published = api.post(f"/admin/portfolio/{item_id}/publish", service="portfolio", body={})
    if published.get("status") != "success":
        detail = unwrap(published) if isinstance(published, dict) else {}
        if not (isinstance(detail, dict) and detail.get("status") == "PUBLISHED"):
            fail(f"Publish failed for {slug}: {published}")

    if item.get("featured"):
        # create may already set featured; toggle only if needed
        detail = unwrap(api.get(f"/admin/portfolio/{item_id}", service="portfolio"))
        if not detail.get("featured"):
            api.post(f"/admin/portfolio/{item_id}/toggle-featured", service="portfolio", body={})
    log(f"  published: {slug}")


def verify(client: AdminApiClient, items: list[dict]) -> None:
    log("Verifying seeded portfolio items ...")
    expected = {i["slug"] for i in items}
    found: set[str] = set()
    missing_thumbs: list[str] = []
    page = 1
    while True:
        public = unwrap(client.get(f"/portfolio?limit=100&page={page}", service="portfolio"))
        page_items = public.get("items", []) if isinstance(public, dict) else []
        if not page_items:
            break
        for i in page_items:
            slug = i.get("slug")
            if slug:
                found.add(slug)
                if slug in expected and not i.get("thumbnailUrl"):
                    missing_thumbs.append(slug)
        if len(page_items) < 100:
            break
        page += 1

    missing = expected - found
    if missing:
        fail(f"Missing published slugs: {', '.join(sorted(list(missing)[:20]))}")
    if missing_thumbs:
        fail(f"Published but missing thumbnailUrl: {', '.join(sorted(missing_thumbs[:20]))}")

    log(f"Public published portfolio items: {len(found & expected)}/{len(expected)} (all with thumbnails)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed portfolio items and thumbnails via API")
    parser.add_argument("--skip-verify", action="store_true")
    parser.add_argument(
        "--refresh-thumbnails",
        action="store_true",
        help="Re-upload public thumbnails for existing items",
    )
    args = parser.parse_args()

    items = load_json(ITEMS_JSON)
    if not isinstance(items, list) or not items:
        fail(f"{ITEMS_JSON} must be a non-empty JSON array")

    client = AdminApiClient()
    client.login()
    if not client.user_id:
        fail("Admin login missing user id")

    categories = fetch_category_map(client)
    if not categories:
        fail("No portfolio categories found — run seed_core (init) first")

    existing = fetch_existing_items(client)
    log(f"Found {len(existing)} existing portfolio items in admin API")
    log(f"Seeding {len(items)} portfolio items from data/portfolio/items.json ...")

    for item in items:
        slug = item["slug"]
        existing_item = existing.get(slug)
        if existing_item:
            warn(f"Item already exists, skipping create: {slug}")
            ensure_published(client, slug, existing_item, bool(item.get("featured")))
            if args.refresh_thumbnails or not (
                existing_item.get("thumbnailUrl") or existing_item.get("thumbnail")
            ):
                attach_public_thumbnail(
                    client, existing_item["id"], slug, resolve_image_path(item)
                )
            continue

        category_id = categories.get(item["categorySlug"])
        if not category_id:
            fail(f"Unknown category slug: {item['categorySlug']} — run seed_core first")

        log(f"Processing: {slug}")
        create_and_publish(client, category_id, item, resolve_image_path(item))
        time.sleep(0.5)

    if not args.skip_verify:
        verify(client, items)
    log("Done.")


if __name__ == "__main__":
    main()
