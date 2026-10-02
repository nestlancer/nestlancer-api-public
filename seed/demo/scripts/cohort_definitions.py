"""10 cohort demo client definitions for scenario scaffolding (15 clients total with original 5).

Original 5 users (arjun-mehta, samira-patel, rahul-desai, ananya-iyer, priya-nair) are unchanged.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Group threads — host user gets group-messages.json
GROUPS: list[dict[str, Any]] = [
    {
        "id": "fintech-recon",
        "title": "Payments ops — Razorpay settlement and webhooks",
        "host": "karthik-menon",
        "members": ["karthik-menon", "ananya-iyer"],
    },
    {
        "id": "logistics-dispatch",
        "title": "Logistics ops — tracking and dispatch",
        "host": "sandeep-chopra",
        "members": ["sandeep-chopra", "rahul-desai"],
    },
]


@dataclass
class FlowDef:
    """One request → quote → optional project pipeline."""

    kind: str
    project_key: str
    title: str
    description: str
    category: str = "webDevelopment"
    budget_min: int = 30000  # rupees (API converts to paise)
    budget_max: int = 80000
    quote_total: int = 5000000
    schedule: str = "30-40-30"
    requires_contract: bool = False
    milestone_name: str = "Phase 1 Delivery"
    milestone_amount: int | None = None


@dataclass
class UserDef:
    seed_key: str
    first_name: str
    last_name: str
    company: str
    job_title: str
    city: str
    industry: str
    cohort: str
    flows: list[FlowDef] = field(default_factory=list)
    group_id: str | None = None

    @property
    def email(self) -> str:
        return f"{self.first_name.lower()}.{self.last_name.lower()}@nestlancer.com"

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def phone(self) -> str:
        n = sum(ord(c) for c in self.seed_key) % 9000000000 + 1000000000
        return f"+91{n}"


def _f(
    kind: str,
    key: str,
    title: str,
    desc: str,
    *,
    cat: str = "webDevelopment",
    bmin: int = 3000000,
    bmax: int = 8000000,
    quote: int = 5000000,
    sched: str = "30-40-30",
    contract: bool = False,
    ms: str = "Phase 1 Delivery",
    ms_amt: int | None = None,
) -> FlowDef:
    return FlowDef(
        kind=kind,
        project_key=key,
        title=title,
        description=desc,
        category=cat,
        budget_min=bmin,
        budget_max=bmax,
        quote_total=quote,
        schedule=sched,
        requires_contract=contract,
        milestone_name=ms,
        milestone_amount=ms_amt or quote,
    )


NEW_USERS: list[UserDef] = [
    # ── A: Completed and visible in the client portal (8) ───────────────
    UserDef("vikram-shah", "Vikram", "Shah", "Shah Textile Exports", "Director", "Surat", "textiles", "completed", [
        _f("completed", "export-portal", "B2B Textile Export Order Portal",
             "Surat wholesale export portal with GST invoicing, container booking, and buyer credit limits.",
             cat="webDevelopment", quote=8500000, ms="Export Portal MVP"),
    ]),
    UserDef("kavya-reddy", "Kavya", "Reddy", "Reddy Pharma Labs", "CTO", "Hyderabad", "pharma", "completed", [
        _f("completed", "batch-tracking", "API Batch Tracking Dashboard",
             "GMP batch traceability dashboard with QR scan and audit log export for CDSCO inspections.",
             cat="webDevelopment", quote=6200000, ms="Batch Tracking MVP"),
    ]),
    UserDef("rajan-kumar", "Rajan", "Kumar", "Kumar Precision Tools", "Plant Head", "Chennai", "manufacturing", "completed", [
        _f("completed", "shop-floor", "Shop-Floor OEE Dashboard",
             "Real-time OEE metrics from PLC data, shift reports, and downtime alerts for CNC lines.",
             cat="webDevelopment", quote=7800000, sched="50-50", ms="OEE Dashboard"),
    ]),
    UserDef("divya-sharma", "Divya", "Sharma", "Sharma Handicrafts", "Founder", "Jaipur", "ecommerce", "completed", [
        _f("completed", "craft-marketplace", "Artisan Marketplace Storefront",
             "Jaipur handicraft D2C store with variant catalog, Razorpay UPI, and Shiprocket delivery.",
             quote=5500000, ms="Storefront MVP"),
    ]),
    UserDef("amit-verma", "Amit", "Verma", "Verma Properties", "Managing Partner", "Delhi", "realEstate", "completed", [
        _f("completed", "lead-crm", "Property Lead CRM",
             "Lead capture from 99acres/MagicBricks, site-visit scheduling, and broker commission tracking.",
             quote=4800000, ms="CRM MVP"),
    ]),
    UserDef("neha-gupta", "Neha", "Gupta", "Gupta HR Cloud", "CEO", "Noida", "saas", "completed", [
        _f("completed", "attendance-saas", "Multi-Tenant Attendance SaaS",
             "Geo-fenced attendance, leave workflows, and payroll export for 50 SMB clients.",
             quote=9200000, ms="Attendance Module"),
    ]),
    UserDef("suresh-iyer", "Suresh", "Iyer", "Iyer Agro Supplies", "Proprietor", "Coimbatore", "agriculture", "completed", [
        _f("completed", "mandi-app", "Farmer Mandi Price App",
             "Tamil Nadu mandi price alerts, cooperative order pooling, and UPI settlement.",
             quote=4200000, ms="Mandi App MVP"),
    ]),
    UserDef("pooja-kulkarni", "Pooja", "Kulkarni", "Kulkarni Clinic Chain", "Operations Head", "Pune", "healthcare", "completed", [
        _f("completed", "clinic-booking", "Multi-Branch Clinic Booking",
             "OPD slot booking, doctor roster, SMS reminders, and Razorpay prepayment.",
             quote=6500000, ms="Booking System"),
    ]),

    # ── B: Active mid-milestone with WIP partial delivery (12) ───────────
    UserDef("karthik-menon", "Karthik", "Menon", "Menon PayTech", "Founder", "Bengaluru", "fintech", "active_wip", [
        _f("active_wip", "upi-switch", "UPI Switch Integration Layer",
             "NPCI UPI switch adapter with merchant onboarding and settlement reconciliation.",
             cat="webDevelopment", quote=12000000, ms="UPI Adapter MVP"),
    ], group_id="fintech-recon"),
    UserDef("sandeep-chopra", "Sandeep", "Chopra", "Chopra Fleet Logistics", "Director", "Chandigarh", "logistics", "active_wip", [
        _f("active_wip", "gps-fleet", "GPS Fleet Tracking Portal",
             "Live truck tracking, geofence alerts, and fuel consumption analytics.",
             quote=7200000, ms="Fleet Dashboard"),
    ], group_id="logistics-dispatch"),
]

assert len(NEW_USERS) == 10, f"expected 10 cohort users, got {len(NEW_USERS)}"
