"""S3-compatible client (MinIO / AWS / Cloudflare R2) for bucket purge.

Credentials come from Infisical via `.env.infisical` (`S3_*` + `STORAGE_BUCKET_*`).
"""

from __future__ import annotations

import os
import time
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


class S3Error(RuntimeError):
    pass


def _is_rate_limited(exc: BaseException) -> bool:
    if isinstance(exc, ClientError):
        code = str(exc.response.get("Error", {}).get("Code", ""))
        status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if status == 429 or code in ("429", "SlowDown", "Throttling", "TooManyRequests"):
            return True
    msg = str(exc).lower()
    return "too many requests" in msg or "slowdown" in msg or "429" in msg


def with_s3_retry(fn, *, attempts: int = 8, base_delay: float = 0.5, label: str = "s3"):
    """Call ``fn`` with exponential backoff on S3 rate-limit / SlowDown errors."""
    last: BaseException | None = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 — retry only rate limits
            if not _is_rate_limited(exc):
                raise
            last = exc
            delay = min(base_delay * (2**i), 30.0)
            print(f"[reset] rate-limited on {label}; retry {i + 1}/{attempts} in {delay:.1f}s")
            time.sleep(delay)
    raise S3Error(f"S3 rate limit exhausted for {label}: {last}")


def resolve_s3_credentials() -> dict[str, str]:
    """Return S3 connection settings from the environment (Infisical export)."""
    endpoint = os.environ.get("S3_ENDPOINT", "").strip().strip("'").strip('"')
    key_id = os.environ.get("S3_ACCESS_KEY_ID", "").strip().strip("'").strip('"')
    secret = os.environ.get("S3_SECRET_ACCESS_KEY", "").strip().strip("'").strip('"')
    region = os.environ.get("S3_REGION", "us-east-1").strip().strip("'").strip('"') or "us-east-1"

    missing = [
        name
        for name, value in (
            ("S3_ENDPOINT", endpoint),
            ("S3_ACCESS_KEY_ID", key_id),
            ("S3_SECRET_ACCESS_KEY", secret),
        )
        if not value
    ]
    if missing:
        raise S3Error(
            "Missing S3 credentials: "
            + ", ".join(missing)
            + ". Export Infisical to .env.infisical "
            + "(bash prod-data/run-seed.sh --env=dev) or set STORAGE_PROVIDER=s3 vars."
        )

    return {
        "endpoint": endpoint,
        "key_id": key_id,
        "secret": secret,
        "region": region,
    }


def s3_client(creds: dict[str, str] | None = None):
    c = creds or resolve_s3_credentials()
    return boto3.client(
        "s3",
        endpoint_url=c["endpoint"],
        aws_access_key_id=c["key_id"],
        aws_secret_access_key=c["secret"],
        region_name=c["region"],
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            retries={"max_attempts": 10, "mode": "adaptive"},
        ),
    )


def bucket_exists(client, bucket: str) -> bool:
    try:
        client.head_bucket(Bucket=bucket)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchBucket", "NotFound", "403"):
            # 403 can mean missing bucket or no access — treat as absent for purge targeting
            return code != "403"
        if code == "403":
            return True  # exists but we may still list/delete with our key
        raise


def ensure_buckets_exist(client, buckets: list[str]) -> list[str]:
    """Return buckets that exist; warn-skip missing names."""
    present: list[str] = []
    for name in buckets:
        try:
            client.head_bucket(Bucket=name)
            present.append(name)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchBucket", "NotFound"):
                continue
            # Some MinIO setups return 403 for head on missing; try list
            try:
                client.list_objects_v2(Bucket=name, MaxKeys=1)
                present.append(name)
            except ClientError:
                continue
    return present


def count_objects(client, bucket: str) -> int:
    total = 0
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        total += len(page.get("Contents") or [])
    return total


def empty_bucket(client, bucket: str) -> tuple[int, int, int]:
    """Delete all objects in a bucket. Returns (before, removed, after)."""
    before = with_s3_retry(lambda: count_objects(client, bucket), label=f"count:{bucket}")
    removed = 0
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        contents = page.get("Contents") or []
        if not contents:
            continue
        # Smaller batches + pacing avoid MinIO / gateway 429s on busy prod endpoints.
        for i in range(0, len(contents), 100):
            batch = contents[i : i + 100]

            def _delete(batch=batch):
                return client.delete_objects(
                    Bucket=bucket,
                    Delete={"Objects": [{"Key": obj["Key"]} for obj in batch], "Quiet": True},
                )

            resp = with_s3_retry(_delete, label=f"delete_objects:{bucket}")
            errors = list(resp.get("Errors") or [])
            rate_errors = [
                e
                for e in errors
                if str(e.get("Code", "")) in ("429", "SlowDown", "Throttling", "TooManyRequests")
                or "Too Many" in str(e.get("Message", ""))
            ]
            if rate_errors:
                time.sleep(2.0)
                keys = [e["Key"] for e in rate_errors if e.get("Key")]

                def _retry_keys(keys=keys):
                    return client.delete_objects(
                        Bucket=bucket,
                        Delete={"Objects": [{"Key": k} for k in keys], "Quiet": True},
                    )

                resp2 = with_s3_retry(_retry_keys, label=f"delete_retry:{bucket}")
                hard = []
                for e in list(resp2.get("Errors") or []) + errors:
                    code = str(e.get("Code", ""))
                    if code in ("429", "SlowDown", "Throttling", "TooManyRequests"):
                        continue
                    if "Too Many" in str(e.get("Message", "")):
                        continue
                    hard.append(e)
                # Deduplicate by key
                seen: set[str] = set()
                errors = []
                for e in hard:
                    k = e.get("Key", "")
                    if k not in seen:
                        seen.add(k)
                        errors.append(e)
            removed += len(batch) - len(errors)
            if errors:
                raise S3Error(
                    f"delete_objects failed in {bucket}: "
                    + "; ".join(f"{e.get('Key')}:{e.get('Code')}" for e in errors[:5])
                )
            time.sleep(0.2)
    after = with_s3_retry(lambda: count_objects(client, bucket), label=f"recount:{bucket}")
    return before, removed, after


def empty_all_buckets(client, buckets: list[str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for name in buckets:
        try:
            before, removed, after = empty_bucket(client, name)
            results.append(
                {
                    "name": name,
                    "before": before,
                    "removed": removed,
                    "after": after,
                    "skipped": False,
                }
            )
        except (S3Error, ClientError) as exc:
            code = ""
            if isinstance(exc, ClientError):
                code = exc.response.get("Error", {}).get("Code", "")
            msg = str(exc)
            if code in ("AccessDenied", "403") or "AccessDenied" in msg:
                results.append(
                    {
                        "name": name,
                        "before": -1,
                        "removed": 0,
                        "after": -1,
                        "skipped": True,
                        "error": msg,
                    }
                )
                continue
            raise
    return results


def object_exists(client, bucket: str, key: str) -> bool:
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return False
        raise
