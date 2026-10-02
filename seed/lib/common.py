#!/usr/bin/env python3
"""Shared helpers for prod-data seed and reset scripts (init, reset)."""
from __future__ import annotations

import os
import subprocess
import sys

from lib.paths import INFISICAL_ENV, REPO_ROOT

# Always prefer Infisical export for DB + object storage (seed/reset target).
INFISICAL_OVERRIDE_KEYS = frozenset(
    {
        "DATABASE_URL",
        "DATABASE_READ_URL",
        "MIGRATION_DATABASE_URL",
        "STORAGE_PROVIDER",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "S3_ENDPOINT",
        "S3_PUBLIC_ENDPOINT",
        "S3_REGION",
        "S3_PRESIGNED_URL_EXPIRY",
        "S3_CONSOLE_URL",
        "CDN_PUBLIC_BASE_URL",
        "STORAGE_BUCKET_PRIVATE",
        "STORAGE_BUCKET_PUBLIC",
        "STORAGE_BUCKET_AVATARS",
        "STORAGE_BUCKET_ATTACHMENTS",
        "STORAGE_BUCKET_QUOTES",
        "STORAGE_BUCKET_DELIVERABLES",
        "STORAGE_BUCKET_REPORTS",
        "STORAGE_BUCKET_PDFS",
        "AUTH_SERVICE_URL",
        "MEDIA_SERVICE_URL",
        "BLOG_SERVICE_URL",
        "ADMIN_SERVICE_URL",
        "PROJECTS_SERVICE_URL",
        "GATEWAY_URL",
        "API_GATEWAY_URL",
    }
)


def load_infisical_env(*, force: bool = False) -> None:
    """Load .env.infisical into os.environ when present.

    When force=True (set by run-seed.sh via PROD_DATA_FORCE_INFISICAL=1), every
    key in the file overwrites the process environment so Infisical is the
    single source of truth for the seed target.
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
        value = value.strip().strip("'").strip('"')
        if not key:
            continue
        if force or key not in os.environ or key in INFISICAL_OVERRIDE_KEYS:
            os.environ[key] = value

load_infisical_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
MIGRATION_DATABASE_URL = os.environ.get("MIGRATION_DATABASE_URL", "")


def reset_database_url() -> str:
    """Connection for destructive reset (TRUNCATE). Requires nl_platform_migrate (DDL role)."""
    if MIGRATION_DATABASE_URL:
        return MIGRATION_DATABASE_URL
    fail(
        "MIGRATION_DATABASE_URL not set — required for prod-data/reset (TRUNCATE). "
        "Add nl_platform_migrate URL to .env.infisical (see prod-data/init/README.md)."
    )


def log(msg: str) -> None:
    print(f"[init] {msg}")


def warn(msg: str) -> None:
    print(f"[warn] {msg}", file=sys.stderr)


def fail(msg: str) -> None:
    print(f"[fail] {msg}", file=sys.stderr)
    sys.exit(1)


def psql_exec(sql: str) -> None:
    if not DATABASE_URL:
        fail("DATABASE_URL not set")
    result = subprocess.run(
        ["psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail(f"SQL failed: {result.stderr.strip() or result.stdout.strip()}")


def psql_scalar(sql: str) -> str | None:
    if not DATABASE_URL:
        return None
    result = subprocess.run(
        ["psql", DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        warn(f"psql check failed: {result.stderr.strip() or result.stdout.strip()}")
        return None
    for line in result.stdout.splitlines():
        value = line.strip()
        if not value:
            continue
        if value.split()[0] in ("INSERT", "UPDATE", "DELETE", "ALTER", "TRUNCATE", "CREATE", "DROP"):
            continue
        return value
    return None


def hash_password_bcrypt(password: str, rounds: int = 12) -> str:
    """Hash password using repo bcrypt (same as auth service)."""
    script = (
        "const bcrypt=require('bcrypt');"
        "bcrypt.hash(process.argv[1],"
        f"{rounds},"
        "(err,hash)=>{if(err){console.error(err);process.exit(1)}console.log(hash)})"
    )
    result = subprocess.run(
        ["node", "-e", script, password],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail(f"bcrypt hash failed: {result.stderr.strip() or result.stdout.strip()}")
    hashed = result.stdout.strip()
    if not hashed:
        fail("bcrypt returned empty hash")
    return hashed


def run_migrate_deploy() -> None:
    """Generate Prisma client / migration SQL if missing, then migrate deploy."""
    script = REPO_ROOT / "scripts" / "db" / "migrate-bootstrap.sh"
    if not script.is_file():
        fail(f"Missing migrate bootstrap script: {script}")

    log("Running Prisma migrate bootstrap (generate + deploy) ...")
    result = subprocess.run(
        ["bash", str(script)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    if result.stdout.strip():
        print(result.stdout.rstrip())
    if result.returncode != 0:
        fail(f"Migration bootstrap failed:\n{result.stderr[-2000:] or result.stdout[-2000:]}")
    log("Migrations applied")
