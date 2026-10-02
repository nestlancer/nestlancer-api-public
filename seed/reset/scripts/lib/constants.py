"""Shared constants for prod-data reset scripts."""

from __future__ import annotations

import os

STORAGE_BUCKET_ENV_KEYS = (
    "STORAGE_BUCKET_PRIVATE",
    "STORAGE_BUCKET_PUBLIC",
    "STORAGE_BUCKET_AVATARS",
    "STORAGE_BUCKET_ATTACHMENTS",
    "STORAGE_BUCKET_QUOTES",
    "STORAGE_BUCKET_DELIVERABLES",
    "STORAGE_BUCKET_REPORTS",
    "STORAGE_BUCKET_PDFS",
)

PRESERVED_TABLES = ("_prisma_migrations",)

TRUNCATE_ALL_DATA_SQL = """
DO $$
DECLARE
  tables text;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ')
  INTO tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations');

  IF tables IS NULL OR tables = '' THEN
    RAISE NOTICE 'No application tables to truncate';
    RETURN;
  END IF;

  EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
END $$;
"""

# Collect storage references from PostgreSQL (run before truncate).
# Column layout: source|bucket|key
STORAGE_OBJECT_SQL = """
SELECT 'doc' AS src, "storageBucket" AS bucket, "storageKey" AS key
FROM "GeneratedDocument"
WHERE "storageKey" IS NOT NULL
UNION ALL
SELECT 'att', COALESCE("storageBucket", ''), "storageKey"
FROM "RequestAttachment"
WHERE "storageKey" IS NOT NULL
UNION ALL
SELECT 'media', COALESCE(NULLIF(metadata->>'storageBucket', ''), ''), metadata->>'storageKey'
FROM "Media"
WHERE metadata->>'storageKey' IS NOT NULL
UNION ALL
SELECT 'avatar', avatar, ''
FROM "User"
WHERE avatar IS NOT NULL AND avatar <> ''
UNION ALL
SELECT 'report', '', url
FROM "ReportExport"
WHERE url IS NOT NULL AND url <> ''
"""


def load_storage_buckets(environ: os._Environ | None = None) -> list[str]:
    env = environ or os.environ
    seen: set[str] = set()
    buckets: list[str] = []
    for key in STORAGE_BUCKET_ENV_KEYS:
        name = env.get(key, "").strip().strip("'").strip('"')
        if name and name not in seen:
            seen.add(name)
            buckets.append(name)
    return buckets


def bucket_env_defaults(environ: os._Environ | None = None) -> dict[str, str]:
    env = environ or os.environ
    return {
        "private": env.get("STORAGE_BUCKET_PRIVATE", "nl-prod-media-private").strip().strip("'").strip('"'),
        "public": env.get("STORAGE_BUCKET_PUBLIC", "nl-prod-media-public").strip().strip("'").strip('"'),
        "avatars": env.get("STORAGE_BUCKET_AVATARS", "nl-prod-user-avatars").strip().strip("'").strip('"'),
        "attachments": env.get("STORAGE_BUCKET_ATTACHMENTS", "nl-prod-service-requests").strip().strip("'").strip('"'),
        "quotes": env.get("STORAGE_BUCKET_QUOTES", "nl-prod-sales-quotes").strip().strip("'").strip('"'),
        "deliverables": env.get("STORAGE_BUCKET_DELIVERABLES", "nl-prod-project-outputs").strip().strip("'").strip('"'),
        "reports": env.get("STORAGE_BUCKET_REPORTS", "nl-prod-admin-reports").strip().strip("'").strip('"'),
        "pdfs": env.get("STORAGE_BUCKET_PDFS", "nl-prod-billing-receipts").strip().strip("'").strip('"'),
    }
