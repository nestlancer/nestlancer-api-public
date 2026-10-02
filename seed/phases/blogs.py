#!/usr/bin/env python3
"""Seed published blog posts from prod-data/data/blogs via the Nestlancer admin API.

Uploads featured images through the media service (S3/MinIO) and creates/publishes posts.
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
from lib.ledger import file_sha256, record  # noqa: E402

BLOGS_JSON = "blogs/blogs.json"
IMAGES_ROOT = DATA_DIR / "blogs"


def resolve_image_path(blog: dict) -> Path:
    rel = blog.get("imageLocal")
    if not rel:
        fail(f"Missing imageLocal for {blog['slug']}")
    # blogs.json uses paths like "images/foo.jpg" relative to blogs data dir
    path = IMAGES_ROOT / rel
    if not path.exists() or path.stat().st_size == 0:
        fail(f"Featured image not found: {path}")
    return path


def fetch_category_map(client: AdminApiClient) -> dict[str, str]:
    resp = client.get("/admin/blog/categories", service="blog")
    items = unwrap(resp)
    if isinstance(items, dict):
        items = items.get("items") or items.get("categories") or list(items.values())
    return {item["slug"]: item["id"] for item in items if isinstance(item, dict)}


def upload_image(client: AdminApiClient, file_path: Path) -> str:
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(file_path.suffix.lower(), "image/jpeg")
    size = file_path.stat().st_size

    req_resp = client.post(
        "/media/upload/request",
        service="media",
        body={
            "filename": file_path.name,
            "mimeType": mime,
            "size": size,
            "fileType": "IMAGE",
        },
    )
    data = unwrap(req_resp)
    media_id = data["mediaId"]
    upload_url = data["uploadUrl"]

    put_code = client.put_bytes(upload_url, file_path.read_bytes(), mime)
    if put_code != 200:
        fail(f"Storage PUT failed ({put_code}) for {file_path.name}")

    client.post("/media/upload/confirm", service="media", body={"uploadId": media_id})

    image_url = ""
    media_status = ""
    for _ in range(60):
        time.sleep(1)
        detail = unwrap(client.get(f"/media/{media_id}", service="media"))
        media_status = detail.get("status", "")
        urls = detail.get("urls") or {}
        image_url = urls.get("original") or urls.get("preview") or urls.get("thumbnail") or ""
        if media_status in {"READY", "PROCESSING"} and image_url:
            break
        if media_status == "FAILED" and image_url:
            warn(f"Media {media_id} FAILED processing but original URL exists")
            break

    if not image_url:
        fail(f"No URL for media {media_id} (status={media_status})")

    log(f"  uploaded {file_path.name} -> {media_id} (status={media_status})")
    return media_id


def fetch_existing_posts(client: AdminApiClient) -> dict[str, str]:
    by_slug: dict[str, str] = {}
    page = 1
    while True:
        resp = client.get(f"/admin/posts?limit=100&page={page}", service="blog")
        data = unwrap(resp)
        items = data.get("items", []) if isinstance(data, dict) else []
        if not items:
            break
        for item in items:
            slug = item.get("slug")
            post_id = item.get("id")
            if slug and post_id:
                by_slug[slug] = post_id
        if len(items) < 100:
            break
        page += 1
    return by_slug


def ensure_published(client: AdminApiClient, slug: str, post_id: str, featured: bool) -> None:
    detail = unwrap(client.get(f"/admin/posts/{post_id}", service="blog"))
    if detail.get("status") == "PUBLISHED":
        log(f"  already published: {slug}")
        return
    published = client.post(f"/admin/posts/{post_id}/publish", service="blog", body={})
    if unwrap(published).get("status") != "PUBLISHED" and published.get("status") != "success":
        # Some responses wrap; accept success envelope
        if published.get("status") != "success":
            fail(f"Publish failed for existing {slug}: {published}")
    if featured:
        client.post(f"/admin/posts/{post_id}/feature", service="blog", body={})
    log(f"  published existing draft: {slug}")


def create_and_publish(
    client: AdminApiClient,
    user_id: str,
    category_id: str,
    blog: dict,
    media_id: str,
) -> None:
    slug = blog["slug"]
    payload = {
        "title": blog["title"],
        "slug": slug,
        "excerpt": blog["excerpt"],
        "content": blog["content"],
        "contentFormat": "MARKDOWN",
        "categoryId": category_id,
        "authorId": user_id,
        "featuredImageId": media_id,
        "tags": blog["tags"],
        "commentsEnabled": True,
        "seo": {
            "title": f"{blog['title']} | Nestlancer Blog",
            "description": blog["excerpt"],
        },
    }
    created = client.post("/admin/posts", service="blog", body=payload)
    post_id = unwrap(created)["id"]
    log(f"  created draft: {slug} ({post_id})")

    published = client.post(f"/admin/posts/{post_id}/publish", service="blog", body={})
    if published.get("status") != "success":
        fail(f"Publish failed for {slug}: {published}")
    if blog.get("featured"):
        client.post(f"/admin/posts/{post_id}/feature", service="blog", body={})
    log(f"  published: {slug}")


def verify(client: AdminApiClient, blogs: list[dict]) -> None:
    log("Verifying seeded posts ...")
    expected = {b["slug"] for b in blogs}
    found: set[str] = set()
    page = 1
    while True:
        public = unwrap(client.get(f"/posts?limit=100&page={page}", service="blog"))
        items = public.get("items", []) if isinstance(public, dict) else []
        if not items:
            break
        found.update(i["slug"] for i in items if i.get("slug"))
        if len(items) < 100:
            break
        page += 1

    missing = expected - found
    if missing:
        fail(f"Missing published slugs: {', '.join(sorted(list(missing)[:20]))}")

    log(f"Public published posts: {len(found & expected)}/{len(expected)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed blog posts and featured images via API")
    parser.add_argument("--skip-verify", action="store_true")
    args = parser.parse_args()

    blogs = load_json(BLOGS_JSON)
    if not isinstance(blogs, list) or not blogs:
        fail(f"{BLOGS_JSON} must be a non-empty JSON array")

    client = AdminApiClient()
    client.login()
    if not client.user_id:
        fail("Admin login missing user id")

    categories = fetch_category_map(client)
    existing_posts = fetch_existing_posts(client)
    log(f"Found {len(existing_posts)} existing posts in admin API")
    log(f"Seeding {len(blogs)} blog posts from data/blogs/blogs.json ...")

    for blog in blogs:
        slug = blog["slug"]
        existing_id = existing_posts.get(slug)
        if existing_id:
            warn(f"Post already exists, skipping create/upload: {slug}")
            ensure_published(client, slug, existing_id, bool(blog.get("featured")))
            continue

        category_id = categories.get(blog["categorySlug"])
        if not category_id:
            fail(f"Unknown category slug: {blog['categorySlug']} — run seed_core first")

        log(f"Processing: {slug}")
        image_path = resolve_image_path(blog)
        media_id = upload_image(client, image_path)
        record("blog-image", slug, file_sha256(image_path), mediaId=media_id)
        create_and_publish(client, client.user_id, category_id, blog, media_id)
        time.sleep(0.5)

    if not args.skip_verify:
        verify(client, blogs)
    log("Done.")


if __name__ == "__main__":
    main()
