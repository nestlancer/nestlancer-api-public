#!/usr/bin/env python3
"""Polish demo account/scenario copy for production-quality seed data.

Fixes:
- Cohort jargon in profile summary/bio ("active wip", "completed", "request draft", …)
- Client-visible WIP / INCOMPLETE staging language in project scenarios
- Mismatched legacy seedKeys (braj-wave / alex-rivera / mei-chen) → persona keys

Idempotent. Does not change passwords or emails.
"""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "payloads" / "demo"
ACCOUNTS = ROOT / "accounts"
SCENARIOS = ROOT / "scenarios"

SEED_KEY_RENAMES = {
    "braj-wave": "arjun-mehta",
    "alex-rivera": "rahul-desai",
    "mei-chen": "ananya-iyer",
}

# City + industry → professional one-line positioning
INDUSTRY_LABEL = {
    "realEstate": "real estate",
    "realestate": "real estate",
    "saas": "SaaS",
    "fintech": "fintech",
    "ecommerce": "e-commerce",
    "edtech": "edtech",
    "ed-tech": "edtech",
    "hrtech": "HR tech",
    "govtech": "govtech",
    "healthcare": "healthcare",
    "logistics": "logistics",
    "manufacturing": "manufacturing",
    "agriculture": "agriculture",
    "tourism": "tourism",
    "hospitality": "hospitality",
    "food": "food & beverage",
    "pharma": "pharma",
    "retail": "retail",
    "media": "media",
    "legal": "legal",
    "ngo": "non-profit",
    "design": "design",
    "energy": "energy",
    "construction": "construction",
    "automotive": "automotive",
    "export": "export trade",
    "textiles": "textiles",
    "sports": "sports",
}

COHORT_SUFFIX_RE = re.compile(
    r"\s*[—\-]\s*(completed|active wip|request draft|request submitted|request review|"
    r"request assigned|request multi|request rejected|quote sent|quote changes|"
    r"quote contract|quote revised|quote declined|review pending|review revision|"
    r"draft bilingual CMS \+ LMS quote with change requests|"
    r"Razorpay reconciliation in progress with duplicate-payment refund|"
    r"warehouse portal quote pending \+ rejected ERP migration|"
    r"completed festive campaign pages \+ website redesign in queue|"
    r"completed B2B portal, active spice D2C store, draft dealer app)\s*$",
    re.I,
)


def industry_phrase(industry: str) -> str:
    key = (industry or "").strip()
    return INDUSTRY_LABEL.get(key, INDUSTRY_LABEL.get(key.lower(), key.replace("_", " ") or "technology"))


def professional_summary(profile: dict) -> str:
    city = profile.get("city") or "India"
    company = profile.get("company") or "their organization"
    job = profile.get("jobTitle") or "Operator"
    industry = industry_phrase(str(profile.get("industry") or ""))
    return f"{job} at {company} in {city}."


def professional_bio(profile: dict, summary: str) -> str:
    """Keep an existing bio. Do not stamp the same sentence onto every account."""
    existing = (profile.get("bio") or "").strip()
    if existing and "dependable digital delivery partners" not in existing.lower():
        return existing
    first = profile.get("firstName") or "The client"
    company = profile.get("company") or "their company"
    city = profile.get("city") or "India"
    job = profile.get("jobTitle") or "operator"
    industry = industry_phrase(str(profile.get("industry") or ""))
    return (
        f"{first} is {job} at {company} in {city}, responsible for {industry} operations."
    )


def polish_profile(path: Path) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    profile = data.get("profile") or {}
    changed = False

    old_summary = data.get("summary") or ""
    new_summary = professional_summary(profile)
    if old_summary != new_summary:
        data["summary"] = new_summary
        changed = True

    old_bio = profile.get("bio") or ""
    new_bio = professional_bio(profile, new_summary)
    if old_bio != new_bio:
        profile["bio"] = new_bio
        changed = True

    # Normalize industry casing for display-ish fields
    industry = profile.get("industry")
    if isinstance(industry, str) and industry == "realEstate":
        # keep API enum if required elsewhere; only fix headline phrasing
        pass

    headline = profile.get("headline") or ""
    if "Realestate" in headline:
        profile["headline"] = headline.replace("Realestate", "Real Estate")
        changed = True
    if "realestate" in headline.lower() and "Real Estate" not in headline:
        profile["headline"] = re.sub(r"[Rr]ealestate", "Real Estate", headline)
        changed = True

    data["profile"] = profile
    if changed:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def polish_json_text(text: str) -> str:
    replacements = [
        (
            "INCOMPLETE staging build — partial project shared for early client feedback.",
            "Staging build shared for early client review and feedback.",
        ),
        (
            "INCOMPLETE staging build - partial project shared for early client feedback.",
            "Staging build shared for early client review and feedback.",
        ),
        ("WIP staging bundle shared", "Staging build ready for review"),
        ("Shared staging WIP build for", "Shared staging build for"),
        ("sharing staging WIP build", "sharing the current staging build"),
        ("staging-wip.zip", "staging-review.zip"),
        ("/assets/wip/", "/assets/review/"),
        ("active wip", "delivery in progress"),
        ("Active WIP", "Delivery in progress"),
    ]
    out = text
    for old, new in replacements:
        out = out.replace(old, new)
    return out


def polish_scenario_files() -> int:
    n = 0
    for path in (SCENARIOS / "users").rglob("*.json"):
        raw = path.read_text(encoding="utf-8")
        updated = polish_json_text(raw)
        # Also polish meta.scenario cohort suffixes into readable labels
        try:
            data = json.loads(updated)
        except json.JSONDecodeError:
            if updated != raw:
                path.write_text(updated, encoding="utf-8")
                n += 1
            continue

        meta_changed = False
        if path.name == "meta.json" and isinstance(data.get("scenario"), str):
            cleaned = COHORT_SUFFIX_RE.sub("", data["scenario"]).strip()
            # Rebuild a professional scenario label from remaining city/industry prefix if present
            if " — " in data["scenario"] or " - " in data["scenario"]:
                # Prefer: "{City} {industry} engagement"
                prefix = re.split(r"\s*[—\-]\s*", data["scenario"], maxsplit=1)[0].strip()
                data["scenario"] = f"{prefix} engagement"
                meta_changed = True
            elif cleaned != data["scenario"]:
                data["scenario"] = cleaned
                meta_changed = True

        # Rename asset path dirs wip -> review in structured fields
        dumped = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
        dumped = polish_json_text(dumped)
        if dumped != raw or meta_changed:
            path.write_text(dumped, encoding="utf-8")
            n += 1
    return n


def rename_seed_keys() -> list[str]:
    """Rename mismatched legacy seedKey directories and rewrite references."""
    logs: list[str] = []
    index_path = ACCOUNTS / "index.json"
    scenarios_index = SCENARIOS / "index.json"
    sources_path = ACCOUNTS / "avatars" / "sources.json"

    for old, new in SEED_KEY_RENAMES.items():
        old_profile = ACCOUNTS / "profiles" / f"{old}.json"
        new_profile = ACCOUNTS / "profiles" / f"{new}.json"
        old_scenario_dir = SCENARIOS / "users" / old
        new_scenario_dir = SCENARIOS / "users" / new
        old_avatar = ACCOUNTS / "avatars" / f"{old}.jpg"
        new_avatar = ACCOUNTS / "avatars" / f"{new}.jpg"

        if old_profile.exists() and not new_profile.exists():
            data = json.loads(old_profile.read_text(encoding="utf-8"))
            data["seedKey"] = new
            if data.get("avatarLocal", "").endswith(f"{old}.jpg"):
                data["avatarLocal"] = f"avatars/{new}.jpg"
            new_profile.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            old_profile.unlink()
            logs.append(f"profile {old} → {new}")

        if old_avatar.exists() and not new_avatar.exists():
            old_avatar.rename(new_avatar)
            logs.append(f"avatar {old}.jpg → {new}.jpg")

        if old_scenario_dir.exists() and not new_scenario_dir.exists():
            # Rewrite file contents then move tree
            for path in old_scenario_dir.rglob("*"):
                if path.is_file() and path.suffix == ".json":
                    text = path.read_text(encoding="utf-8")
                    text2 = text.replace(old, new)
                    # Also rename braj-* nested keys to arjun-mehta-* etc.
                    if old == "braj-wave":
                        text2 = text2.replace("braj-", "arjun-mehta-")
                    path.write_text(text2, encoding="utf-8")
            # Rename nested files that contain old key in filename
            for path in sorted(old_scenario_dir.rglob("*"), reverse=True):
                if path.is_file() and old in path.name:
                    path.rename(path.with_name(path.name.replace(old, new).replace("braj-", "arjun-mehta-") if old == "braj-wave" else path.name.replace(old, new)))
                elif path.is_file() and old == "braj-wave" and "braj-" in path.name:
                    path.rename(path.with_name(path.name.replace("braj-", "arjun-mehta-")))
            shutil.move(str(old_scenario_dir), str(new_scenario_dir))
            logs.append(f"scenarios {old}/ → {new}/")

    def rewrite_index(path: Path) -> None:
        if not path.exists():
            return
        text = path.read_text(encoding="utf-8")
        original = text
        for old, new in SEED_KEY_RENAMES.items():
            text = text.replace(f'"{old}"', f'"{new}"')
            text = text.replace(f"/{old}/", f"/{new}/")
            text = text.replace(f"/{old}.", f"/{new}.")
            if old == "braj-wave":
                text = text.replace("braj-", "arjun-mehta-")
        if text != original:
            path.write_text(text, encoding="utf-8")
            logs.append(f"rewrote {path.relative_to(ROOT)}")

    rewrite_index(index_path)
    rewrite_index(scenarios_index)
    rewrite_index(sources_path)

    # Global sweep for leftover old keys under data/
    for path in ROOT.rglob("*.json"):
        text = path.read_text(encoding="utf-8")
        updated = text
        for old, new in SEED_KEY_RENAMES.items():
            updated = updated.replace(old, new)
        if "braj-" in updated and "arjun-mehta-" not in updated.replace("arjun-mehta-", ""):
            # only replace remaining braj- prefixes
            updated = re.sub(r"\bbraj-", "arjun-mehta-", updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            logs.append(f"sweep {path.relative_to(ROOT)}")

    return logs


def rename_wip_asset_dirs() -> list[str]:
    logs: list[str] = []
    for wip_dir in (SCENARIOS / "users").rglob("wip"):
        if wip_dir.is_dir():
            target = wip_dir.with_name("review")
            if not target.exists():
                wip_dir.rename(target)
                logs.append(f"dir {wip_dir} → {target}")
            # rename zip files inside
            for f in target.glob("*staging-wip*"):
                f.rename(f.with_name(f.name.replace("staging-wip", "staging-review")))
                logs.append(f"file {f.name}")
            for f in target.glob("*wip*"):
                if f.is_file():
                    f.rename(f.with_name(f.name.replace("wip", "review")))
                    logs.append(f"file {f.name}")
    return logs


def main() -> None:
    profiles_changed = 0
    for path in sorted((ACCOUNTS / "profiles").glob("*.json")):
        if polish_profile(path):
            profiles_changed += 1

    scenarios_changed = polish_scenario_files()
    rename_logs = rename_seed_keys()
    asset_logs = rename_wip_asset_dirs()

    # Second pass profiles after rename
    for path in sorted((ACCOUNTS / "profiles").glob("*.json")):
        polish_profile(path)

    print(f"profiles_updated={profiles_changed}")
    print(f"scenario_files_updated={scenarios_changed}")
    print(f"renames={len(rename_logs)}")
    for line in rename_logs:
        print(f"  {line}")
    print(f"asset_renames={len(asset_logs)}")
    for line in asset_logs:
        print(f"  {line}")


if __name__ == "__main__":
    main()
