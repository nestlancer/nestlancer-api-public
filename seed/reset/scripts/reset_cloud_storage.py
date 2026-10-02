"""Reset cloud storage — delete all objects in every configured S3/MinIO bucket.

Uses `S3_*` + `STORAGE_BUCKET_*` from Infisical (`.env.infisical`).
Run before reset_database.py.

Usage (from repo root):
    python3 prod-data/reset/scripts/reset_cloud_storage.py
    # Or via unified runner (exports Infisical first):
    bash prod-data/run-seed.sh --env=dev --layers=reset
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

from botocore.exceptions import ClientError

RESET_SCRIPTS = Path(__file__).resolve().parent
PROD_DATA_DIR = RESET_SCRIPTS.parent.parent
sys.path.insert(0, str(PROD_DATA_DIR))
sys.path.insert(0, str(RESET_SCRIPTS / "lib"))

from lib.common import DATABASE_URL, fail, load_infisical_env, warn  # noqa: E402
from credentials import load_reset_env  # noqa: E402
from constants import STORAGE_OBJECT_SQL, bucket_env_defaults, load_storage_buckets  # noqa: E402
from s3_client import (  # noqa: E402
    S3Error,
    empty_all_buckets,
    object_exists,
    resolve_s3_credentials,
    s3_client,
    with_s3_retry,
)

load_infisical_env()
load_reset_env()


def log(msg: str) -> None:
    print(f"[reset] {msg}")


def parse_avatar_ref(value: str, defaults: dict[str, str]) -> tuple[str, str] | None:
    if not value:
        return None
    for avatar_bucket in (defaults["avatars"], "nl-prod-user-avatars", "nl-dev-user-avatars"):
        needle = f"{avatar_bucket}/"
        if value.startswith("http") and needle in value:
            key = value.split(needle, 1)[1].split("?", 1)[0]
            return defaults["avatars"], key
    if "/" in value and not value.startswith("http"):
        return defaults["avatars"], value
    return None


def parse_url_ref(value: str, buckets: list[str]) -> tuple[str, str] | None:
    if not value or not value.startswith("http"):
        return None
    for bucket in buckets:
        needle = f"/{bucket}/"
        if needle in value:
            key = value.split(needle, 1)[1].split("?", 1)[0]
            return bucket, key
    return None


def collect_db_object_refs(defaults: dict[str, str], buckets: list[str]) -> list[tuple[str, str]]:
    if not DATABASE_URL:
        warn("DATABASE_URL not set — skipping DB object collection")
        return []

    result = subprocess.run(
        ["psql", DATABASE_URL, "-t", "-A", "-F", "|", "-c", STORAGE_OBJECT_SQL],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        # Fresh / unmigrated DB often lacks tables — bucket purge still proceeds.
        warn(
            "DB object collection skipped "
            f"(schema may be empty): {result.stderr.strip() or result.stdout.strip()}"
        )
        return []

    refs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()

    def add(bucket: str, key: str) -> None:
        bucket = bucket.strip()
        key = key.strip()
        if not bucket or not key:
            return
        pair = (bucket, key)
        if pair not in seen:
            seen.add(pair)
            refs.append(pair)

    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        if len(parts) < 3:
            continue
        src, bucket, key = parts[0], parts[1], "|".join(parts[2:])

        if src == "avatar":
            parsed = parse_avatar_ref(bucket, defaults) or parse_url_ref(bucket, buckets)
            if parsed:
                add(*parsed)
            continue

        if src == "report":
            parsed = parse_url_ref(key, buckets)
            if parsed:
                add(*parsed)
            continue

        if not bucket:
            if src == "att":
                bucket = defaults["attachments"]
            elif src == "media":
                bucket = defaults["private"]
            else:
                warn(f"Skipping {src} object with empty bucket: {key[:80]}")
                continue

        add(bucket, key)

    return refs


def delete_object_refs(client, refs: list[tuple[str, str]]) -> int:
    deleted = 0
    for idx, (bucket, key) in enumerate(refs):
        try:
            with_s3_retry(
                lambda b=bucket, k=key: client.delete_object(Bucket=b, Key=k),
                label=f"delete_ref:{bucket}/{key[:40]}",
            )
            deleted += 1
        except ClientError as exc:
            warn(f"delete failed s3://{bucket}/{key}: {exc.response.get('Error', {}).get('Code', exc)}")
        except Exception as exc:  # noqa: BLE001
            warn(f"delete failed s3://{bucket}/{key}: {exc}")
        # Pace individual deletes — prod S3 gateways often 429 under burst DELETE.
        if idx and idx % 20 == 0:
            time.sleep(0.5)
        else:
            time.sleep(0.05)
    return deleted


def verify_bucket_results(results: list[dict]) -> bool:
    ok = True
    for row in results:
        if row.get("skipped"):
            warn(f"  verify {row['name']}: skipped (no delete permission)")
            continue
        if row["after"] == 0:
            log(f"  verify {row['name']}: empty ({row['before']} deleted)")
        else:
            warn(f"verify {row['name']}: {row['after']} object(s) remain")
            ok = False
    return ok


def verify_db_refs(client, refs: list[tuple[str, str]]) -> bool:
    remaining = 0
    for bucket, key in refs:
        if object_exists(client, bucket, key):
            remaining += 1
            if remaining <= 5:
                warn(f"verify s3://{bucket}/{key}: still exists")
    if not refs:
        return True
    if remaining == 0:
        log(f"  verify database-referenced objects: 0/{len(refs)} remain")
        return True
    warn(f"verify database-referenced objects: {remaining}/{len(refs)} remain")
    return False


def main() -> None:
    provider = os.environ.get("STORAGE_PROVIDER", "").strip().lower()
    if provider and provider not in ("s3", "local"):
        warn(f"STORAGE_PROVIDER={provider!r} — reset expects s3 (MinIO/AWS compatible)")

    buckets = load_storage_buckets()
    if not buckets:
        fail("No STORAGE_BUCKET_* values in env — export Infisical first (run-seed.sh --env=dev)")

    try:
        creds = resolve_s3_credentials()
    except S3Error as exc:
        fail(str(exc))

    log("=== Reset cloud storage (S3 / MinIO) ===")
    log(f"Endpoint: {creds['endpoint']}")
    log(f"Region:   {creds['region']}")
    log(f"Buckets ({len(buckets)}): {', '.join(buckets)}")

    client = s3_client(creds)
    defaults = bucket_env_defaults()

    # Best-effort DB-ref deletes are redundant when we empty every bucket below.
    # Individual DELETE under rate limits burns the budget and delays purge.
    # Opt in with RESET_DELETE_DB_REFS=1 if you need targeted deletes first.
    refs: list[tuple[str, str]] = []
    if os.environ.get("RESET_DELETE_DB_REFS", "").strip() in ("1", "true", "yes"):
        refs = collect_db_object_refs(defaults, buckets)
        if refs:
            log(f"Deleting {len(refs)} database-referenced object(s) ...")
            delete_object_refs(client, refs)
    else:
        log("Skipping per-object DB-ref deletes (bucket purge covers them)")

    try:
        results = empty_all_buckets(client, buckets)
    except S3Error as exc:
        fail(f"S3 purge error: {exc}")
    except ClientError as exc:
        fail(f"S3 API error: {exc.response.get('Error', {}).get('Message', exc)}")

    total_deleted = sum(r["removed"] for r in results)
    for row in results:
        if row.get("skipped"):
            warn(f"  {row['name']}: skipped purge ({row.get('error', 'AccessDenied')})")
            continue
        log(
            f"  {row['name']}: removed {row['removed']} object(s) "
            f"(was {row['before']}, now {row['after']})"
        )

    log(f"Cloud reset complete — {total_deleted} delete operation(s)")

    log("Verifying cloud storage ...")
    if not results:
        fail("Cloud verification failed — no buckets were purged")
    if not verify_bucket_results(results):
        fail("Cloud verification failed — objects remain in one or more buckets")

    log("Cloud verification passed")


if __name__ == "__main__":
    main()
