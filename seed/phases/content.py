#!/usr/bin/env python3
"""Seed blogs and portfolio, including media uploads."""

from __future__ import annotations

import runpy
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> None:
    runpy.run_path(str(HERE / "blogs.py"), run_name="__main__")
    runpy.run_path(str(HERE / "portfolio.py"), run_name="__main__")


if __name__ == "__main__":
    main()
