#!/usr/bin/env python3
"""Load scenario JSON from data/scenarios/ and assemble runnable seed definitions."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from lib.api_client import fail
from lib.paths import ACCOUNTS_DIR, ACCOUNTS_INDEX, SCENARIOS_DIR, SCENARIOS_INDEX


def load_accounts_index() -> dict:
    if not ACCOUNTS_INDEX.exists():
        fail(f"Missing {ACCOUNTS_INDEX}")
    return json.loads(ACCOUNTS_INDEX.read_text())


def load_scenarios_index() -> dict:
    if not SCENARIOS_INDEX.exists():
        fail(f"Missing {SCENARIOS_INDEX}")
    return json.loads(SCENARIOS_INDEX.read_text())


def load_profile(seed_key: str) -> dict:
    path = ACCOUNTS_DIR / "profiles" / f"{seed_key}.json"
    if not path.exists():
        fail(f"Missing profile: {path}")
    return json.loads(path.read_text())


def _request_from_interactions(doc: dict) -> dict:
    req: dict[str, Any] = {"seedKey": doc["seedKey"]}
    admin_workflow: list[dict] = []

    for step in sorted(doc.get("interactions", []), key=lambda s: s.get("order", 0)):
        action = step["action"]
        if action == "createRequest":
            req["create"] = step["payload"]
        elif action == "uploadAttachments":
            req["attachments"] = step["files"]
        elif action == "submitRequest":
            req["submit"] = True
        elif step.get("actor") == "admin":
            admin_step = {"action": action, **step.get("payload", {})}
            admin_workflow.append(admin_step)

    if admin_workflow:
        req["adminWorkflow"] = admin_workflow
    return req


def _quote_from_interactions(doc: dict) -> dict:
    quote: dict[str, Any] = {
        "seedKey": doc["seedKey"],
        "requestSeedKey": doc["requestSeedKey"],
    }
    if doc.get("parentQuoteSeedKey"):
        quote["parentQuoteSeedKey"] = doc["parentQuoteSeedKey"]
    workflow: list[dict] = []

    for step in sorted(doc.get("interactions", []), key=lambda s: s.get("order", 0)):
        action = step["action"]
        if action == "uploadQuoteAttachments":
            quote["attachmentFiles"] = step["files"]
        elif action == "createQuote":
            quote["create"] = step["payload"]
        elif action in {"sendQuote", "reviseQuote", "resendQuote", "updateRequestStatus"}:
            workflow.append({
                k: v for k, v in step.items()
                if k not in {"order", "endpoint"}
            })
        elif action in {"accept", "decline", "requestChanges"}:
            workflow.append({
                "actor": "client",
                "action": action,
                "payload": step.get("payload", {}),
            })
            quote["userAction"] = {
                "action": action,
                "payload": step.get("payload", {}),
            }

    if workflow:
        quote["workflow"] = workflow
    if "userAction" not in quote:
        quote["userAction"] = None
    return quote


def _project_from_interactions(doc: dict) -> dict:
    project: dict[str, Any] = {
        "seedKey": doc["seedKey"],
        "quoteSeedKey": doc["quoteSeedKey"],
    }
    if doc.get("projectKey"):
        project["projectKey"] = doc["projectKey"]
    if doc.get("waitForAutoCreate"):
        project["waitForAutoCreate"] = True

    # Preserve interaction order so deposit → work → approve → later pay stays sequential.
    workflow: list[dict] = []
    messages: list[dict] = []
    final_delivery: dict | None = None

    for step in sorted(doc.get("interactions", []), key=lambda s: s.get("order", 0)):
        action = step["action"]
        if action == "projectMessaging":
            messages = step["messages"]
            workflow.append({
                "actor": "both",
                "action": "projectMessaging",
                "messages": step["messages"],
            })
        elif action == "finalDelivery":
            final_delivery = {
                k: v for k, v in step.items()
                if k not in {"order", "actor", "action", "endpoint"}
            }
            workflow.append({
                "actor": "admin",
                "action": "finalDelivery",
                **final_delivery,
            })
        elif step.get("actor") in {"client", "admin"}:
            workflow.append({
                k: v for k, v in step.items()
                if k not in {"order", "endpoint"}
            })

    if workflow:
        project["workflow"] = workflow
    # Legacy fields kept for older callers / partial docs
    admin_workflow = [s for s in workflow if s.get("actor") == "admin" and s["action"] not in {"finalDelivery", "projectMessaging"}]
    user_actions = [s for s in workflow if s.get("actor") == "client"]
    if admin_workflow:
        project["adminWorkflow"] = admin_workflow
    if messages:
        project["messages"] = messages
    if user_actions:
        project["userActions"] = user_actions
    if final_delivery:
        project["finalDelivery"] = final_delivery
    return project


def _load_json_dir(flow_dir: Path, subdir: str) -> list[dict]:
    path = flow_dir / subdir
    if not path.is_dir():
        return []
    return [json.loads(f.read_text()) for f in sorted(path.glob("*.json"))]


def load_user_scenario(flow_dir: Path, seed_key: str) -> dict:
    """Assemble full scenario dict from split interaction files + account profile."""
    profile_doc = load_profile(seed_key)
    meta_path = flow_dir / "meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    scenario: dict[str, Any] = {
        "seedKey": seed_key,
        "scenario": meta.get("scenario", profile_doc.get("summary", "")),
        "profile": profile_doc["profile"],
        "requests": [_request_from_interactions(d) for d in _load_json_dir(flow_dir, "requests")],
        "quotes": [_quote_from_interactions(d) for d in _load_json_dir(flow_dir, "quotes")],
        "projects": [_project_from_interactions(d) for d in _load_json_dir(flow_dir, "projects")],
    }

    if profile_doc.get("emailSuppression"):
        scenario["emailSuppression"] = profile_doc["emailSuppression"]
    if profile_doc.get("notificationPreferences"):
        scenario["notificationPreferences"] = profile_doc["notificationPreferences"]

    dm_path = flow_dir / "direct-messages.json"
    if dm_path.exists():
        dm = json.loads(dm_path.read_text())
        for step in dm.get("interactions", []):
            if step.get("action") == "directThread":
                scenario["directMessages"] = step["messages"]
                break

    gm_path = flow_dir / "group-messages.json"
    if gm_path.exists():
        gm = json.loads(gm_path.read_text())
        for step in gm.get("interactions", []):
            if step.get("action") == "groupThread":
                scenario["groupMessages"] = {
                    "title": step.get("title", "Project group"),
                    "memberEmails": step.get("memberEmails", []),
                    "messages": step.get("messages", []),
                }
                break

    n_path = flow_dir / "notifications.json"
    if n_path.exists():
        notes = json.loads(n_path.read_text())
        scenario["notifications"] = [
            {k: v for k, v in step.items()
             if k not in {"order", "actor", "action", "endpoint"}}
            for step in notes.get("interactions", [])
        ]

    return scenario


def iter_scenario_users() -> list[tuple[dict, dict, Path]]:
    """Yield (account_entry, scenario_index_entry, flow_dir) for each demo user."""
    accounts = load_accounts_index()
    scenarios = load_scenarios_index()
    flow_by_key = {u["seedKey"]: u for u in scenarios["users"]}

    results: list[tuple[dict, dict, Path]] = []
    for account_entry in accounts["users"]:
        seed_key = account_entry["seedKey"]
        flow_entry = flow_by_key.get(seed_key)
        if not flow_entry:
            fail(f"No scenario entry for seedKey={seed_key}")
        flow_dir = SCENARIOS_DIR / flow_entry["flowDir"]
        if not flow_dir.is_dir():
            fail(f"Missing scenario directory: {flow_dir}")
        results.append((account_entry, flow_entry, flow_dir))
    return results
