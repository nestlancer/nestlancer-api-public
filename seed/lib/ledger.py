"""Records seedKey, content hash, and the id returned by the API.

A later run can see that a file did not change and skip the upload.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from lib.paths import GENERATED_DIR

LEDGER_PATH = GENERATED_DIR / "ledger.json"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load() -> dict[str, Any]:
    if not LEDGER_PATH.exists():
        return {}
    data = json.loads(LEDGER_PATH.read_text())
    return data if isinstance(data, dict) else {}


def unchanged(kind: str, key: str, digest: str) -> bool:
    row = _load().get(f"{kind}:{key}")
    return isinstance(row, dict) and row.get("sha256") == digest


def record(kind: str, key: str, digest: str, **extra: Any) -> None:
    data = _load()
    data[f"{kind}:{key}"] = {"sha256": digest, **extra}
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    LEDGER_PATH.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
