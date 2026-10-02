#!/usr/bin/env python3
"""Reset database data — truncate all application tables (schema preserved).

Deletes all row data from public tables except _prisma_migrations.
Does NOT drop tables, indexes, or enums.

Usage:
    python3 prod-data/reset/scripts/reset_database.py
    python3 prod-data/reset/scripts/reset_database.py --verify
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

RESET_SCRIPTS = Path(__file__).resolve().parent
PROD_DATA_DIR = RESET_SCRIPTS.parent.parent
sys.path.insert(0, str(PROD_DATA_DIR))
sys.path.insert(0, str(RESET_SCRIPTS / "lib"))

from lib.common import DATABASE_URL, fail, load_infisical_env, psql_scalar, reset_database_url, warn  # noqa: E402
from constants import TRUNCATE_ALL_DATA_SQL  # noqa: E402

load_infisical_env()


def log(msg: str) -> None:
    print(f"[reset] {msg}")


def psql(sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["psql", reset_database_url(), "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
    )


def psql_query(sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["psql", reset_database_url(), "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", sql],
        capture_output=True,
        text=True,
    )


def count_application_rows() -> int:
    if not DATABASE_URL:
        return -1
    sql = """
SELECT COALESCE(SUM(n), 0)::text
FROM (
  SELECT (xpath('/row/c/text()', query_to_xml(
    format('SELECT COUNT(*)::bigint AS c FROM %I.%I', table_schema, table_name),
    false, true, ''
  )))[1]::text::bigint AS n
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('_prisma_migrations')
) counts;
"""
    raw = psql_scalar(sql)
    if raw is None:
        return -1
    return int(raw)


def list_nonempty_tables() -> list[tuple[str, int]]:
    if not DATABASE_URL:
        return []
    sql = """
SELECT quote_ident(table_name), (
  xpath('/row/c/text()', query_to_xml(
    format('SELECT COUNT(*) AS c FROM %I.%I', table_schema, table_name), false, true, ''
  ))
)[1]::text::bigint
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('_prisma_migrations')
ORDER BY 2 DESC;
"""
    result = subprocess.run(
        ["psql", DATABASE_URL, "-t", "-A", "-F", "|", "-c", sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        warn(f"Could not list table counts: {result.stderr.strip()}")
        return []
    rows: list[tuple[str, int]] = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line or "|" not in line:
            continue
        name, count_str = line.split("|", 1)
        count = int(count_str)
        if count > 0:
            rows.append((name.strip('"'), count))
    return rows


def verify_empty() -> bool:
    remaining = list_nonempty_tables()
    total = count_application_rows()
    if total == 0 and not remaining:
        log("  verify database: 0 rows in application tables")
        return True
    for name, count in remaining[:10]:
        warn(f"  verify {name}: {count} row(s) remain")
    if len(remaining) > 10:
        warn(f"  ... and {len(remaining) - 10} more non-empty table(s)")
    warn(f"verify database: {total} total row(s) remain")
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Truncate all application database data")
    parser.add_argument("--verify", action="store_true", help="Verify tables are empty after truncate")
    args = parser.parse_args()

    log("=== Reset database (truncate all data, keep schema) ===")
    before = count_application_rows()
    if before >= 0:
        log(f"  rows before: {before}")

    result = psql(TRUNCATE_ALL_DATA_SQL)
    if result.returncode != 0:
        fail(f"Database truncate failed: {result.stderr.strip() or result.stdout.strip()}")

    after = count_application_rows()
    log(f"  rows after: {after}")
    log("Database data reset complete (tables and _prisma_migrations preserved)")

    if args.verify:
        log("Verifying database ...")
        if not verify_empty():
            fail("Database verification failed — row data remains")
        log("Database verification passed")


if __name__ == "__main__":
    main()
