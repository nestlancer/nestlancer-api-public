#!/usr/bin/env python3
"""Scaffold profiles + scenario JSON for 10 cohort users (15 clients total with legacy 5).

Does not modify the existing 5 demo users. Updates accounts/scenarios indices.

Usage:
    python3 prod-data/user-admin-interaction/scripts/scaffold_cohort_users.py
    python3 prod-data/user-admin-interaction/scripts/scaffold_cohort_users.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from cohort_definitions import GROUPS, NEW_USERS, FlowDef, UserDef
from lib.paths import ACCOUNTS_DIR, ACCOUNTS_INDEX, SCENARIOS_DIR, SCENARIOS_INDEX
from lib.profile_content import enrich_profile_doc

EXISTING_SEED_KEYS = {"arjun-mehta", "samira-patel", "rahul-desai", "ananya-iyer", "priya-nair"}
PASSWORD = "REDACTED_DEMO_PASSWORD"

NOTIF_PREFS = {
    "preferences": {
        "PROJECT": {"email": False, "push": False, "inApp": True},
        "QUOTE": {"email": False, "push": False, "inApp": True},
        "PAYMENT": {"email": False, "push": False, "inApp": True},
        "MESSAGE": {"email": False, "push": False, "inApp": True},
    }
}


def slug(seed_key: str, project_key: str, suffix: str) -> str:
    return f"{seed_key}-{project_key}-{suffix}"


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def profile_doc(user: UserDef) -> dict:
    doc = {
        "seedKey": user.seed_key,
        "displayName": user.display_name,
        "summary": f"{user.city} {user.industry} — {user.cohort.replace('_', ' ')}",
        "profile": {
            "email": user.email,
            "password": PASSWORD,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "phone": user.phone,
            "company": user.company,
            "jobTitle": user.job_title,
            "city": user.city,
            "industry": user.industry,
            "timezone": "Asia/Kolkata",
        },
        "emailSuppression": {"disableEmailChannel": True, "disablePushChannel": True},
        "notificationPreferences": NOTIF_PREFS,
    }
    return enrich_profile_doc(doc)


def asset_brief(flow: FlowDef) -> str:
    return f"projects/{flow.project_key}/assets/request-brief.pdf"


def asset_quote(flow: FlowDef, revised: bool = False) -> str:
    name = "quote-proposal-revised.pdf" if revised else "quote-proposal.pdf"
    return f"projects/{flow.project_key}/assets/{name}"


def asset_deliverable(flow: FlowDef, name: str) -> str:
    return f"projects/{flow.project_key}/assets/deliverables/{name}"


def asset_wip_zip(flow: FlowDef) -> str:
    return f"projects/{flow.project_key}/assets/review/{flow.project_key}-staging-review.zip"


def asset_final_zip(flow: FlowDef) -> str:
    return f"projects/{flow.project_key}/assets/final/nestlancer-{flow.project_key}-v1.0.zip"


def request_doc(user: UserDef, flow: FlowDef, req_key: str, *, submit: bool, admin_status: str | None = None, assign: bool = False) -> dict:
    interactions: list[dict] = [
        {
            "order": 1,
            "actor": "client",
            "action": "createRequest",
            "endpoint": "POST /requests",
            "payload": {
                "title": flow.title,
                "description": flow.description,
                "category": flow.category,
                "budget": {
                    "min": flow.budget_min,
                    "max": flow.budget_max,
                    "currency": "INR",
                    "flexible": True,
                },
                "timeline": {
                    "preferredStartDate": "2026-07-01T00:00:00Z",
                    "deadline": "2026-10-01T23:59:59Z",
                    "flexible": True,
                },
                "requirements": [
                    f"Built for {user.company} ({user.city})",
                    "INR billing with milestone payments",
                    "Admin progress visibility for stakeholders",
                ],
            },
        },
    ]
    order = 2
    if flow.kind != "request_draft":
        interactions.append({
            "order": order,
            "actor": "client",
            "action": "uploadAttachments",
            "endpoint": "POST /requests/:id/attachments",
            "files": [asset_brief(flow)],
        })
        order += 1
    if submit:
        interactions.append({
            "order": order,
            "actor": "client",
            "action": "submitRequest",
            "endpoint": "POST /requests/:id/submit",
            "payload": {"confirmComplete": True},
        })
        order += 1
    if admin_status == "underReview":
        interactions.append({
            "order": order,
            "actor": "admin",
            "action": "updateStatus",
            "endpoint": "PATCH /admin/requests/:id/status",
            "payload": {
                "status": "underReview",
                "notes": f"{user.industry} vertical — triaged for {user.city} client.",
            },
        })
        order += 1
    if assign:
        interactions.append({
            "order": order,
            "actor": "admin",
            "action": "assign",
            "endpoint": "POST /admin/requests/:id/assign",
            "payload": {"assigneeEmail": "admin@nestlancer.com", "notes": "Assigned to delivery pod"},
        })
        order += 1
    if admin_status == "rejected":
        interactions.append({
            "order": order,
            "actor": "admin",
            "action": "updateStatus",
            "endpoint": "PATCH /admin/requests/:id/status",
            "payload": {
                "status": "rejected",
                "notes": "Scope not aligned with current capacity — revisit next quarter.",
            },
        })
    return {"seedKey": req_key, "phase": "01-request", "interactions": interactions}


def quote_items(flow: FlowDef, total_rupees: int) -> list[dict]:
    third = total_rupees // 3
    rem = total_rupees - third * 2
    return [
        {"description": f"Discovery, architecture, and {flow.milestone_name} setup", "quantity": 1, "unitPrice": third},
        {"description": "Core implementation and integrations", "quantity": 1, "unitPrice": third},
        {"description": "QA, UAT support, and handoff", "quantity": 1, "unitPrice": rem},
    ]


def quote_doc(user: UserDef, flow: FlowDef, req_key: str, quote_key: str, *, kind: str, parent_key: str | None = None) -> dict:
    total_rupees = flow.quote_total // 100
    interactions: list[dict] = [
        {
            "order": 1,
            "actor": "admin",
            "action": "uploadQuoteAttachments",
            "endpoint": "POST /media/upload/request",
            "files": [asset_quote(flow)],
        },
        {
            "order": 2,
            "actor": "admin",
            "action": "createQuote",
            "endpoint": "POST /admin/requests/:id/quotes",
            "payload": {
                "items": quote_items(flow, total_rupees),
                "schedulePreset": flow.schedule,
                "currency": "INR",
                "taxPercentage": 0,
                "validUntil": "2026-09-30T23:59:59Z",
                "requiresContract": flow.requires_contract,
                "revisionsIncluded": 2,
                "internalNotes": f"{user.company} — {user.city} {user.industry} engagement.",
            },
        },
        {"order": 3, "actor": "admin", "action": "sendQuote", "endpoint": "POST /admin/quotes/:id/send"},
    ]
    order = 4
    if kind in {"quote_changes", "quote_revised"}:
        interactions.append({
            "order": order,
            "actor": "client",
            "action": "requestChanges",
            "endpoint": "POST /quotes/:id/request-changes",
            "payload": {
                "changes": [
                    {"area": "budget", "request": "Split optional modules into add-on line items."},
                    {"area": "timeline", "request": "Extend integration milestone by 2 weeks."},
                ],
                "additionalNotes": "Otherwise aligned — please revise quote.",
            },
        })
        order += 1
    if kind == "quote_revised":
        interactions.append({
            "order": order,
            "actor": "admin",
            "action": "uploadQuoteAttachments",
            "endpoint": "POST /media/upload/request",
            "files": [asset_quote(flow, revised=True)],
        })
        order += 1
        interactions.append({
            "order": order,
            "actor": "admin",
            "action": "reviseQuote",
            "endpoint": "POST /admin/quotes/:id/revise",
            "payload": {
                "items": quote_items(flow, total_rupees + 5000),
                "internalNotes": "Revised per client change requests.",
            },
        })
        order += 1
        interactions.append({"order": order, "actor": "admin", "action": "sendQuote", "endpoint": "POST /admin/quotes/:id/send"})
        order += 1
    if kind == "quote_declined":
        interactions.append({
            "order": order,
            "actor": "client",
            "action": "decline",
            "endpoint": "POST /quotes/:id/decline",
            "payload": {
                "reason": "budgetConstraints",
                "feedback": "Exceeds quarterly budget — will revisit later.",
                "requestRevision": False,
            },
        })
    doc: dict[str, Any] = {"seedKey": quote_key, "requestSeedKey": req_key, "phase": "02-quote", "interactions": interactions}
    if parent_key:
        doc["parentQuoteSeedKey"] = parent_key
    return doc


def accept_step(user: UserDef, order: int) -> dict:
    return {
        "order": order,
        "actor": "client",
        "action": "accept",
        "endpoint": "POST /quotes/:id/accept",
        "payload": {
            "acceptTerms": True,
            "signatureName": user.display_name,
            "signatureDate": "2026-07-15T10:00:00Z",
        },
    }


# Mirrors backend payment-schedule presets (see payment-schedule.util.ts).
SCHEDULE_PRESETS: dict[str, list[tuple[str, int]]] = {
    "50-50": [("Deposit", 50), ("Final payment", 50)],
    "30-70": [("Deposit", 30), ("Final payment", 70)],
    "30-40-30": [
        ("Deposit", 30),
        ("Mid-project payment", 40),
        ("Final payment", 30),
    ],
    "25-25-25-25": [
        ("Deposit", 25),
        ("Milestone 2", 25),
        ("Milestone 3", 25),
        ("Final payment", 25),
    ],
    "100-upfront": [("Full payment", 100)],
}


def schedule_installments(schedule: str, quote_total: int) -> list[tuple[str, int]]:
    """Return (label, amount_paise) rows for a quote schedule preset."""
    preset = SCHEDULE_PRESETS.get(schedule, SCHEDULE_PRESETS["30-40-30"])
    rows: list[tuple[str, int]] = []
    allocated = 0
    for index, (label, pct) in enumerate(preset):
        if index == len(preset) - 1:
            amount = quote_total - allocated
        else:
            amount = quote_total * pct // 100
            allocated += amount
        rows.append((label, amount))
    return rows


def payment_amounts(schedule: str, quote_total: int) -> tuple[int, int, int]:
    """Return (deposit, mid, final) in paise — legacy helper for 3-step schedules."""
    rows = schedule_installments(schedule, quote_total)
    deposit = rows[0][1] if rows else 0
    if len(rows) <= 2:
        final = rows[-1][1] if len(rows) > 1 else 0
        return deposit, 0, final
    mid = rows[1][1]
    final = rows[-1][1]
    return deposit, mid, final


def serialized_payment_steps(
    flow: FlowDef,
    user: UserDef,
    *,
    start_order: int,
) -> list[dict]:
    """Request + record every post-deposit installment in schedule order."""
    installments = schedule_installments(flow.schedule, flow.quote_total)
    post_deposit = installments[1:]
    steps: list[dict] = []
    order = start_order

    for label, amount in post_deposit:
        steps.extend([
            {
                "order": order,
                "actor": "admin",
                "action": "requestMilestonePayment",
                "endpoint": "POST /admin/payments/milestones/:id/request-payment",
                "milestoneName": label,
            },
            {
                "order": order + 1,
                "actor": "admin",
                "action": "createManualPayment",
                "endpoint": "POST /admin/payments/manual",
                "milestoneName": label,
                "payload": {
                    "amount": amount,
                    "currency": "INR",
                    "notes": f"{label} — {user.company}",
                },
            },
        ])
        order += 2

    return steps


def project_completed(user: UserDef, flow: FlowDef, quote_key: str, proj_key: str) -> dict:
    deposit, _, _ = payment_amounts(flow.schedule, flow.quote_total)
    ms_amt = flow.milestone_amount or flow.quote_total
    payment_steps = serialized_payment_steps(flow, user, start_order=8)
    tail_order = payment_steps[-1]["order"] + 1 if payment_steps else 8
    return {
        "seedKey": proj_key,
        "projectKey": flow.project_key,
        "quoteSeedKey": quote_key,
        "phase": "03-project",
        "waitForAutoCreate": True,
        "interactions": [
            {
                "order": 1,
                "actor": "admin",
                "action": "createMilestones",
                "endpoint": "POST /admin/projects/:id/milestones",
                "milestones": [{
                    "name": flow.milestone_name,
                    "description": flow.description[:200],
                    "startDate": "2026-06-01",
                    "endDate": "2026-08-15",
                    "amount": ms_amt,
                    "currency": "INR",
                    "order": 1,
                }],
            },
            {
                "order": 2,
                "actor": "admin",
                "action": "createManualPayment",
                "endpoint": "POST /admin/payments/manual",
                "milestoneKind": "deposit",
                "payload": {
                    "amount": deposit,
                    "currency": "INR",
                    "notes": f"Deposit — {user.company}",
                    "invoiceNumber": f"INV-{user.seed_key[:6].upper()}-001",
                },
            },
            {
                "order": 3,
                "actor": "admin",
                "action": "createProgressEntry",
                "endpoint": "POST /admin/progress/projects/:id",
                "milestoneName": flow.milestone_name,
                "payload": {
                    "type": "UPDATE",
                    "title": f"Daily update — {flow.milestone_name}",
                    "description": "Core features implemented and staging environment ready for review.",
                    "notifyClient": True,
                    "visibility": "CLIENT_VISIBLE",
                },
            },
            {
                "order": 4,
                "actor": "admin",
                "action": "uploadDeliverable",
                "endpoint": "POST /admin/projects/:id/deliverables",
                "milestoneName": flow.milestone_name,
                "files": [asset_deliverable(flow, "milestone-1-handoff.pdf")],
                "description": "Milestone handoff documentation and staging access guide.",
            },
            {
                "order": 5,
                "actor": "admin",
                "action": "completeMilestone",
                "endpoint": "POST /admin/milestones/:id/complete",
                "milestoneName": flow.milestone_name,
            },
            {
                "order": 6,
                "actor": "client",
                "action": "approveDeliverable",
                "endpoint": "POST /deliverables/:id/approve",
                "deliverableIndex": 0,
                "payload": {"feedback": "Handoff reviewed — looks good."},
            },
            {
                "order": 7,
                "actor": "client",
                "action": "approveMilestone",
                "endpoint": "POST /progress/milestones/:id/approve",
                "milestoneName": flow.milestone_name,
                "payload": {"feedback": "Milestone approved."},
            },
            *payment_steps,
            {
                "order": tail_order,
                "actor": "admin",
                "action": "updateStatus",
                "endpoint": "PATCH /admin/projects/:id/status",
                "status": "REVIEW",
                "reason": "Ready for client sign-off",
                "notifyClient": True,
            },
            {
                "order": tail_order + 1,
                "actor": "client",
                "action": "submitFeedback",
                "endpoint": "POST /projects/:id/feedback",
                "payload": {
                    "rating": 5,
                    "comment": f"Excellent delivery for {user.company}.",
                },
            },
            {
                "order": tail_order + 2,
                "actor": "client",
                "action": "approveProject",
                "endpoint": "POST /projects/:id/approve",
                "payload": {
                    "rating": 5,
                    "feedback": {
                        "quality": 5,
                        "communication": 5,
                        "timeliness": 5,
                        "professionalism": 5,
                        "overallSatisfaction": 5,
                    },
                    "comments": f"Approved — {flow.title} is ready for production.",
                },
            },
            {
                "order": tail_order + 3,
                "actor": "admin",
                "action": "finalDelivery",
                "endpoint": "POST /admin/projects/:id/final-delivery",
                "files": [asset_final_zip(flow)],
                "description": f"Final production bundle — {flow.title}",
            },
        ],
    }


def project_active_wip(user: UserDef, flow: FlowDef, quote_key: str, proj_key: str) -> dict:
    """Mid-project: M1 done, M2 in progress with partial WIP zip sent to client."""
    # Deposit is the first schedule installment (30% of 30-40-30), never quote/3.
    # quote/3 wrote ₹24,000 against a ₹21,600 deposit and the ledger diverged.
    deposit = schedule_installments(flow.schedule, flow.quote_total)[0][1]
    m1 = f"{flow.milestone_name}"
    m2 = "Phase 2 — Extended Scope"
    return {
        "seedKey": proj_key,
        "projectKey": flow.project_key,
        "quoteSeedKey": quote_key,
        "phase": "03-project",
        "waitForAutoCreate": True,
        "interactions": [
            {
                "order": 1,
                "actor": "admin",
                "action": "createMilestones",
                "endpoint": "POST /admin/projects/:id/milestones",
                "milestones": [
                    {
                        "name": m1,
                        "description": "Foundation delivery",
                        "startDate": "2026-06-01",
                        "endDate": "2026-07-15",
                        "amount": 0,
                        "currency": "INR",
                        "order": 1,
                    },
                    {
                        "name": m2,
                        "description": "Extended features and integrations",
                        "startDate": "2026-07-16",
                        "endDate": "2026-09-01",
                        "amount": 0,
                        "currency": "INR",
                        "order": 2,
                    },
                ],
            },
            {
                "order": 2,
                "actor": "admin",
                "action": "createManualPayment",
                "endpoint": "POST /admin/payments/manual",
                "milestoneKind": "deposit",
                "payload": {
                    "amount": deposit,
                    "currency": "INR",
                    "notes": f"Deposit — {user.company}",
                },
            },
            {
                "order": 3,
                "actor": "admin",
                "action": "createProgressEntry",
                "endpoint": "POST /admin/progress/projects/:id",
                "milestoneName": m1,
                "payload": {
                    "type": "UPDATE",
                    "title": f"Daily update — {m1}",
                    "description": f"{m1} is with the client for review.",
                    "notifyClient": True,
                    "visibility": "CLIENT_VISIBLE",
                },
            },
            {
                "order": 4,
                "actor": "admin",
                "action": "uploadDeliverable",
                "endpoint": "POST /admin/projects/:id/deliverables",
                "milestoneName": m1,
                "files": [asset_deliverable(flow, "milestone-1-spec.pdf")],
                "description": "M1 specification and API contract.",
            },
            {
                "order": 5,
                "actor": "admin",
                "action": "completeMilestone",
                "endpoint": "POST /admin/milestones/:id/complete",
                "milestoneName": m1,
            },
            {
                "order": 6,
                "actor": "client",
                "action": "approveMilestone",
                "endpoint": "POST /progress/milestones/:id/approve",
                "milestoneName": m1,
                "payload": {"feedback": "M1 approved — proceed to phase 2."},
            },
            {
                "order": 7,
                "actor": "admin",
                "action": "createProgressEntry",
                "endpoint": "POST /admin/progress/projects/:id",
                "milestoneName": m2,
                "payload": {
                    "type": "UPDATE",
                    "title": f"In progress — {m2}",
                    "description": "Phase 2 is underway. The current staging build is ready for early feedback.",
                    "notifyClient": True,
                    "visibility": "CLIENT_VISIBLE",
                },
            },
            {
                "order": 8,
                "actor": "admin",
                "action": "uploadDeliverable",
                "endpoint": "POST /admin/projects/:id/deliverables",
                "milestoneName": m2,
                "files": [asset_wip_zip(flow)],
                "description": "INCOMPLETE staging build — partial project for progress review (not final).",
            },
            {
                "order": 9,
                "actor": "admin",
                "action": "createProgressEntry",
                "endpoint": "POST /admin/progress/projects/:id",
                "milestoneName": m2,
                "payload": {
                    "type": "DELIVERABLE_UPLOAD",
                    "title": "Staging build ready for review",
                    "description": f"Staging build uploaded for {flow.title}. This is the current review build, not the final handoff.",
                    "notifyClient": True,
                    "visibility": "CLIENT_VISIBLE",
                },
            },
            {
                "order": 10,
                "actor": "both",
                "action": "projectMessaging",
                "endpoint": "POST /messages/projects/:id",
                "messages": [{
                    "sender": "admin",
                    "content": f"Shared the current staging build for {flow.title}. Please review it in the project thread; final delivery follows phase 2 sign-off.",
                }],
            },
        ],
    }


def project_review(user: UserDef, flow: FlowDef, quote_key: str, proj_key: str, *, revision: bool) -> dict:
    deposit = schedule_installments(flow.schedule, flow.quote_total)[0][1]
    interactions: list[dict] = [
        {
            "order": 1,
            "actor": "admin",
            "action": "createMilestones",
            "endpoint": "POST /admin/projects/:id/milestones",
            "milestones": [{
                "name": flow.milestone_name,
                "description": flow.description[:200],
                "startDate": "2026-05-01",
                "endDate": "2026-07-01",
                "amount": 0,
                "currency": "INR",
                "order": 1,
            }],
        },
        {
            "order": 2,
            "actor": "admin",
            "action": "createManualPayment",
            "endpoint": "POST /admin/payments/manual",
            "milestoneKind": "deposit",
            "payload": {"amount": deposit, "currency": "INR", "notes": "Deposit received"},
        },
        {
            "order": 3,
            "actor": "admin",
            "action": "uploadDeliverable",
            "endpoint": "POST /admin/projects/:id/deliverables",
            "milestoneName": flow.milestone_name,
            "files": [asset_deliverable(flow, "milestone-1-handoff.pdf")],
            "description": "Delivery pack for review.",
        },
        {
            "order": 4,
            "actor": "admin",
            "action": "completeMilestone",
            "endpoint": "POST /admin/milestones/:id/complete",
            "milestoneName": flow.milestone_name,
        },
        {
            "order": 5,
            "actor": "admin",
            "action": "updateStatus",
            "endpoint": "PATCH /admin/projects/:id/status",
            "status": "REVIEW",
            "reason": "Awaiting client decision",
            "notifyClient": True,
        },
    ]
    if revision:
        interactions.append({
            "order": 6,
            "actor": "client",
            "action": "requestRevision",
            "endpoint": "POST /projects/:id/request-revision",
            "payload": {
                "reason": "Minor UI tweaks and reporting filters needed before sign-off.",
            },
        })
    return {
        "seedKey": proj_key,
        "projectKey": flow.project_key,
        "quoteSeedKey": quote_key,
        "phase": "03-project",
        "waitForAutoCreate": True,
        "interactions": interactions,
    }


def direct_messages(user: UserDef) -> dict:
    return {
        "phase": "07-direct-messages",
        "interactions": [{
            "order": 1,
            "actor": "admin",
            "action": "directThread",
            "endpoint": "POST /messages/threads/direct",
            "messages": [
                {"sender": "admin", "content": f"Hi {user.first_name} — welcome to Nestlancer. Let us know if you have questions about your request."},
                {"sender": "client", "content": f"Thanks — we're {user.company} based in {user.city}. Looking forward to working together."},
            ],
        }],
    }


def group_messages_for(group: dict) -> dict:
    from cohort_definitions import NEW_USERS
    email_by_key = {u.seed_key: u.email for u in NEW_USERS}
    email_by_key.update({
        "ananya-iyer": "ananya.iyer@nestlancer.com",
        "rahul-desai": "rahul.desai@nestlancer.com",
        "arjun-mehta": "arjun.mehta@nestlancer.com",
        "samira-patel": "samira.patel@nestlancer.com",
        "priya-nair": "priya.nair@nestlancer.com",
    })
    members = [email_by_key[k] for k in group["members"] if k in email_by_key]
    mention_labels = []
    for key in group["members"][:2]:
        u = next((x for x in NEW_USERS if x.seed_key == key), None)
        if u is None:
            continue
        mention_labels.append(f"@{u.first_name} {u.last_name}")
    mention_suffix = f" {' '.join(mention_labels)}" if mention_labels else ""
    msgs = [
        {
            "sender": "admin",
            "content": f"Welcome to {group['title']} — sharing cross-project learnings here.{mention_suffix}",
        },
    ]
    for key in group["members"][:2]:
        u = next((x for x in NEW_USERS if x.seed_key == key), None)
        if u is None:
            continue
        msgs.append({
            "sender": "client",
            "senderEmail": u.email,
            "content": f"Hi from {u.company} — glad to compare notes with peers.",
        })
    msgs.append({"sender": "admin", "content": "I'll schedule a joint review of patterns that worked across your projects."})
    return {
        "phase": "07-group-messages",
        "interactions": [{
            "order": 1,
            "actor": "admin",
            "action": "groupThread",
            "endpoint": "POST /messages/threads/group",
            "title": group["title"],
            "memberEmails": members,
            "messages": msgs,
        }],
    }


def scaffold_user(user: UserDef, dry_run: bool) -> None:
    flow_dir = SCENARIOS_DIR / "users" / user.seed_key
    profile_path = ACCOUNTS_DIR / "profiles" / f"{user.seed_key}.json"

    if not dry_run:
        write_json(profile_path, profile_doc(user))
        write_json(flow_dir / "meta.json", {
            "seedKey": user.seed_key,
            "scenario": profile_doc(user)["summary"],
            "cohort": user.cohort,
            "city": user.city,
            "industry": user.industry,
        })

    for flow in user.flows:
        req_key = slug(user.seed_key, flow.project_key, "req")
        quote_key = slug(user.seed_key, flow.project_key, "quote")
        proj_key = slug(user.seed_key, flow.project_key, "project")

        kind = flow.kind
        if kind == "request_draft":
            req = request_doc(user, flow, req_key, submit=False)
        elif kind == "request_submitted":
            req = request_doc(user, flow, req_key, submit=True)
        elif kind == "request_review":
            req = request_doc(user, flow, req_key, submit=True, admin_status="underReview")
        elif kind == "request_assigned":
            req = request_doc(user, flow, req_key, submit=True, admin_status="underReview", assign=True)
        elif kind == "request_rejected":
            req = request_doc(user, flow, req_key, submit=True, admin_status="rejected")
        else:
            req = request_doc(user, flow, req_key, submit=True, admin_status="underReview")

        if not dry_run:
            write_json(flow_dir / "requests" / f"{req_key}.json", req)

        if kind in {"request_draft", "request_submitted", "request_review", "request_rejected", "request_assigned"}:
            continue

        if kind in {"quote_sent", "quote_contract"}:
            qdoc = quote_doc(user, flow, req_key, quote_key, kind=kind)
        elif kind == "quote_changes":
            qdoc = quote_doc(user, flow, req_key, quote_key, kind="quote_changes")
        elif kind == "quote_declined":
            qdoc = quote_doc(user, flow, req_key, quote_key, kind="quote_declined")
        elif kind == "quote_revised":
            qdoc = quote_doc(user, flow, req_key, quote_key, kind="quote_revised")
        else:
            qdoc = quote_doc(user, flow, req_key, quote_key, kind="quote_sent")
            qdoc["interactions"].append(accept_step(user, order=max(i["order"] for i in qdoc["interactions"]) + 1))

        if not dry_run:
            write_json(flow_dir / "quotes" / f"{quote_key}.json", qdoc)

        if kind in {"quote_sent", "quote_changes", "quote_revised", "quote_declined", "quote_contract"}:
            continue

        if kind == "completed":
            proj = project_completed(user, flow, quote_key, proj_key)
        elif kind == "active_wip":
            proj = project_active_wip(user, flow, quote_key, proj_key)
        elif kind == "review_revision":
            proj = project_review(user, flow, quote_key, proj_key, revision=True)
        elif kind in {"review_pending"}:
            proj = project_review(user, flow, quote_key, proj_key, revision=False)
        else:
            continue

        if not dry_run:
            write_json(flow_dir / "projects" / f"{proj_key}.json", proj)

    if not dry_run:
        write_json(flow_dir / "direct-messages.json", direct_messages(user))
        if user.group_id:
            group = next(g for g in GROUPS if g["id"] == user.group_id)
            if group["host"] == user.seed_key:
                write_json(flow_dir / "group-messages.json", group_messages_for(group))


def update_indices(dry_run: bool) -> None:
    accounts = json.loads(ACCOUNTS_INDEX.read_text())
    scenarios = json.loads(SCENARIOS_INDEX.read_text())

    existing_account_keys = {u["seedKey"] for u in accounts["users"]}
    existing_scenario_keys = {u["seedKey"] for u in scenarios["users"]}

    for user in NEW_USERS:
        entry = {
            "seedKey": user.seed_key,
            "displayName": user.display_name,
            "email": user.email,
            "profileFile": f"profiles/{user.seed_key}.json",
            "summary": profile_doc(user)["summary"],
        }
        if user.seed_key not in existing_account_keys:
            accounts["users"].append(entry)
        if user.seed_key not in existing_scenario_keys:
            scenarios["users"].append({
                "seedKey": user.seed_key,
                "displayName": user.display_name,
                "flowDir": f"users/{user.seed_key}",
                "summary": profile_doc(user)["summary"],
            })

    if not dry_run:
        write_json(ACCOUNTS_INDEX, accounts)
        write_json(SCENARIOS_INDEX, scenarios)


def regenerate_completed_projects(dry_run: bool) -> None:
    """Rewrite project JSON for completed cohort flows (payment serialization fix)."""
    count = 0
    for user in NEW_USERS:
        for flow in user.flows:
            if flow.kind != "completed":
                continue
            quote_key = slug(user.seed_key, flow.project_key, "quote")
            proj_key = slug(user.seed_key, flow.project_key, "project")
            flow_dir = SCENARIOS_DIR / "users" / user.seed_key
            proj = project_completed(user, flow, quote_key, proj_key)
            if not dry_run:
                write_json(flow_dir / "projects" / f"{proj_key}.json", proj)
            print(f"[regenerate] {proj_key}")
            count += 1
    print(f"[regenerate] Done — {count} completed project(s)" + (" (dry run)" if dry_run else ""))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--regenerate-completed",
        action="store_true",
        help="Rewrite completed-cohort project JSON (e.g. after payment-flow fixes)",
    )
    args = parser.parse_args()

    if args.regenerate_completed:
        regenerate_completed_projects(args.dry_run)
        return

    for user in NEW_USERS:
        if user.seed_key in EXISTING_SEED_KEYS:
            raise SystemExit(f"Conflict with existing user: {user.seed_key}")
        scaffold_user(user, args.dry_run)
        print(f"[scaffold] {user.seed_key} ({user.cohort}, {len(user.flows)} flow(s))")

    update_indices(args.dry_run)
    print(f"[scaffold] Done — {len(NEW_USERS)} users" + (" (dry run)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
