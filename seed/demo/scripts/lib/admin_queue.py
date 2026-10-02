#!/usr/bin/env python3
"""Serialized admin worker queue — one shared admin, many concurrent clients."""
from __future__ import annotations

import queue
import threading
import traceback
from collections.abc import Callable
from typing import Any, TypeVar

from lib.api_client import log, warn

T = TypeVar("T")


class AdminTaskQueue:
    """FIFO queue with one worker thread processing admin API tasks."""

    def __init__(self, name: str = "admin-worker") -> None:
        self._queue: queue.Queue[Any] = queue.Queue()
        self._thread = threading.Thread(target=self._worker, name=name, daemon=True)
        self._lock = threading.Lock()
        self._started = False

    def start(self) -> None:
        with self._lock:
            if self._started:
                return
            self._thread.start()
            self._started = True
            log("Admin task queue started (single worker — no admin deadlock)")

    def run(self, label: str, fn: Callable[[], T], timeout: float = 300) -> T:
        if not self._started:
            self.start()

        done = threading.Event()
        result_box: dict[str, Any] = {}

        self._queue.put((label, fn, result_box, done))

        if not done.wait(timeout=timeout):
            raise TimeoutError(f"Admin task timed out after {timeout}s: {label}")

        if "error" in result_box:
            raise result_box["error"]
        return result_box.get("result")

    def _worker(self) -> None:
        while True:
            item = self._queue.get()
            try:
                if item is None:
                    return
                label, fn, result_box, done = item
                log(f"[admin-queue] {label}")
                try:
                    result_box["result"] = fn()
                except Exception as exc:
                    result_box["error"] = exc
                    warn(f"Admin task failed ({label}): {exc}")
                    traceback.print_exc()
                finally:
                    done.set()
            finally:
                self._queue.task_done()

    def shutdown(self, timeout: float = 120) -> None:
        if not self._started:
            return
        self._queue.put(None)
        self._thread.join(timeout=timeout)
        log("Admin task queue stopped")
