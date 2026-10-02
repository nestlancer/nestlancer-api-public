"""Derive public profile fields (headline, bio, skills) for demo seed accounts."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from cohort_definitions import NEW_USERS, UserDef

COHORT_BY_KEY: dict[str, UserDef] = {u.seed_key: u for u in NEW_USERS}

LEGACY_META: dict[str, dict[str, str]] = {
    "arjun-mehta": {"city": "Ahmedabad", "industry": "wholesale"},
    "samira-patel": {"city": "Mumbai", "industry": "marketing"},
    "rahul-desai": {"city": "Pune", "industry": "logistics"},
    "ananya-iyer": {"city": "Bengaluru", "industry": "fintech"},
    "priya-nair": {"city": "Kochi", "industry": "edtech"},
}

INDUSTRY_SKILLS: dict[str, list[str]] = {
    "textiles": ["Export Operations", "B2B Sales", "Inventory Management"],
    "pharma": ["GMP Compliance", "Batch Tracking", "Quality Assurance"],
    "manufacturing": ["Operations", "OEE Analytics", "Supply Chain"],
    "ecommerce": ["D2C Growth", "Catalog Management", "Checkout Optimization"],
    "realEstate": ["Lead Management", "CRM", "Sales Operations"],
    "saas": ["Product Management", "Multi-Tenant SaaS", "Customer Onboarding"],
    "agriculture": ["Agri Supply Chain", "Cooperative Ops", "Rural Payments"],
    "healthcare": ["Clinic Operations", "Patient Scheduling", "Healthcare IT"],
    "fintech": ["Payment Reconciliation", "Razorpay", "Webhook Integrations"],
    "logistics": ["Fleet Management", "Warehouse Ops", "Last-Mile Delivery"],
    "food": ["Cloud Kitchen Ops", "Order Management", "Delivery Partners"],
    "tourism": ["Travel Booking", "Seasonal Pricing", "Hospitality Tech"],
    "edtech": ["LMS Administration", "Online Assessments", "Learning Design"],
    "hrtech": ["Payroll", "HR Operations", "Compliance"],
    "hospitality": ["Property Management", "OTA Integrations", "Guest Experience"],
    "wholesale": ["B2B Trade", "Inventory", "GST Invoicing"],
    "marketing": ["Campaign Strategy", "Landing Pages", "Performance Marketing"],
    "chemicals": ["MSDS Compliance", "Safety Documentation", "B2B Catalog"],
    "nonprofit": ["Donor Management", "Fundraising", "Impact Reporting"],
    "media": ["Content Management", "Publishing", "Brand Storytelling"],
    "legal": ["Case Management", "Document Workflow", "Client Portals"],
    "automotive": ["Dealer Networks", "B2B Ordering", "Parts Catalog"],
    "energy": ["Asset Monitoring", "Field Operations", "Reporting"],
    "retail": ["POS Integrations", "Store Operations", "Inventory Sync"],
}

DEFAULT_SKILLS = ["Business Operations", "Vendor Management", "Digital Transformation"]

AVATAR_COLORS = [
    (39, 42, 122),
    (22, 182, 165),
    (79, 70, 229),
    (14, 116, 144),
    (180, 83, 9),
    (190, 24, 93),
    (21, 128, 61),
    (124, 58, 237),
]


def normalize_phone(phone: str) -> str:
    """Strip formatting so values match E.164 validation."""
    cleaned = re.sub(r"[\s\-()]", "", phone.strip())
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if cleaned and cleaned[0].isdigit():
        cleaned = "+" + cleaned
    return cleaned


def resolve_location(profile_doc: dict) -> tuple[str, str]:
    seed_key = profile_doc.get("seedKey", "")
    cohort = COHORT_BY_KEY.get(seed_key)
    if cohort:
        return cohort.city, cohort.industry
    legacy = LEGACY_META.get(seed_key, {})
    city = profile_doc.get("profile", {}).get("city") or legacy.get("city", "India")
    industry = profile_doc.get("profile", {}).get("industry") or legacy.get("industry", "business")
    return city, industry


def build_headline(profile: dict, city: str, industry: str) -> str:
    job = profile.get("jobTitle") or "Business Owner"
    company = profile.get("company") or "their company"
    industry_label = industry.replace("_", " ").title()
    return f"{job} · {company} ({city} · {industry_label})"


def build_bio(profile: dict, profile_doc: dict, city: str, industry: str) -> str:
    """Fallback only. Profile JSON should carry a unique bio so the portal is not templated."""
    first = profile.get("firstName", "Client")
    company = profile.get("company", "their business")
    job = profile.get("jobTitle") or "operator"
    industry_label = industry.replace("_", " ").lower()
    return (
        f"{first} is {job} at {company} in {city}. "
        f"The engagement covers {industry_label} operations they run day to day."
    )


def build_skills(industry: str, job_title: str) -> list[str]:
    base = list(INDUSTRY_SKILLS.get(industry, DEFAULT_SKILLS))
    job = (job_title or "").strip()
    if job and job not in base:
        base.insert(0, job)
    return base[:5]


def enrich_profile_doc(profile_doc: dict) -> dict:
    """Return profile doc with headline, bio, skills, city, industry, avatarFile filled in."""
    seed_key = profile_doc["seedKey"]
    profile = profile_doc.setdefault("profile", {})
    city, industry = resolve_location(profile_doc)

    profile.setdefault("city", city)
    profile.setdefault("industry", industry)
    profile.setdefault("headline", build_headline(profile, city, industry))
    profile.setdefault("bio", build_bio(profile, profile_doc, city, industry))
    profile.setdefault("skills", build_skills(industry, profile.get("jobTitle", "")))
    if profile.get("phone"):
        profile["phone"] = normalize_phone(profile["phone"])

    profile_doc.setdefault("avatarLocal", f"avatars/{seed_key}.jpg")
    profile_doc.pop("avatarFile", None)
    return profile_doc


def avatar_color(seed_key: str) -> tuple[int, int, int]:
    score = sum(ord(c) for c in seed_key)
    return AVATAR_COLORS[score % len(AVATAR_COLORS)]


def initials(first_name: str, last_name: str) -> str:
    parts = [first_name[:1], last_name[:1]]
    return "".join(p.upper() for p in parts if p)


def profile_patch_payload(profile: dict) -> dict[str, Any]:
    """Fields accepted by PATCH /users/profile."""
    payload: dict[str, Any] = {}
    for key in ("firstName", "lastName", "headline", "bio", "skills", "timezone", "language", "country"):
        value = profile.get(key)
        if value is not None and value != "":
            payload[key] = value
    if profile.get("phone"):
        payload["phone"] = normalize_phone(profile["phone"])
    return payload
