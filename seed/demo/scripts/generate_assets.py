#!/usr/bin/env python3
"""Generate PDF/zip assets referenced by scenario interaction files.

Output: prod-data/.generated/user-admin-interaction/users/{seedKey}/...

Usage:
    python3 prod-data/user-admin-interaction/scripts/generate_assets.py
"""
from __future__ import annotations

import json
import re
import sys
import textwrap
import zipfile
from datetime import date
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import cairosvg
from fpdf import FPDF
from PIL import Image, ImageDraw, ImageFont

from lib.paths import GENERATED_DIR, PACKAGE_ROOT, PROD_DATA_DIR, REPO_ROOT, SCENARIOS_DIR
LOGO_SVG = REPO_ROOT / "libs" / "pdf" / "assets" / "logo-full-light.svg"
LOGO_PNG = GENERATED_DIR / "_cache" / "nestlancer-logo.png"
TODAY = date.today().strftime("%B %d, %Y")

BRAND_NAVY = (39, 42, 122)
BRAND_TEAL = (22, 182, 165)
BRAND_MUTED = (100, 116, 139)


def ensure_logo_png() -> Path:
    LOGO_PNG.parent.mkdir(parents=True, exist_ok=True)
    if not LOGO_PNG.exists() or LOGO_PNG.stat().st_mtime < LOGO_SVG.stat().st_mtime:
        cairosvg.svg2png(url=str(LOGO_SVG), write_to=str(LOGO_PNG), output_width=600)
    return LOGO_PNG


class UserBriefPDF(FPDF):
    """Plain client-upload style — no Nestlancer branding."""

    def __init__(self, author: str) -> None:
        super().__init__()
        self.author = author

    def header(self) -> None:
        self.set_font("Times", "", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, f"Prepared by: {self.author}", align="L")
        self.ln(8)


class AdminDocumentPDF(FPDF):
    """Nestlancer-branded official document."""

    def __init__(self, doc_type: str, doc_number: str) -> None:
        super().__init__()
        self.doc_type = doc_type
        self.doc_number = doc_number
        self.logo_path = ensure_logo_png()

    def header(self) -> None:
        self.image(str(self.logo_path), x=10, y=8, w=52)
        self.set_xy(130, 10)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*BRAND_NAVY)
        self.cell(0, 6, self.doc_type.upper(), align="R")
        self.set_xy(130, 17)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*BRAND_MUTED)
        self.cell(0, 5, f"Doc No. {self.doc_number}", align="R")
        self.set_xy(130, 23)
        self.cell(0, 5, TODAY, align="R")
        self.set_y(32)
        self.set_draw_color(*BRAND_NAVY)
        self.set_line_width(0.6)
        self.line(10, 32, 200, 32)
        self.ln(8)

    def footer(self) -> None:
        self.set_y(-18)
        self.set_draw_color(*BRAND_NAVY)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*BRAND_MUTED)
        self.cell(
            0, 5,
            "Nestlancer  |  Confidential  |  nestlancer.com  |  support@nestlancer.com",
            align="C",
        )
        self.cell(0, 5, f"Page {self.page_no()}", align="C")


def write_user_pdf(path: Path, title: str, author: str, sections: list[tuple[str, list[str]]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf = UserBriefPDF(author)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.set_font("Times", "B", 16)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(0, 9, title)
    pdf.ln(4)

    pdf.set_font("Times", "", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 6, f"Date: {TODAY}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    for heading, bullets in sections:
        pdf.set_font("Times", "B", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, heading, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_font("Times", "", 10)
        for item in bullets:
            pdf.set_x(pdf.l_margin + 2)
            pdf.multi_cell(0, 5.5, f"- {item}")
        pdf.ln(3)

    pdf.output(str(path))


def write_admin_pdf(
    path: Path,
    title: str,
    doc_type: str,
    doc_number: str,
    sections: list[tuple[str, list[str]]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf = AdminDocumentPDF(doc_type, doc_number)
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 17)
    pdf.set_text_color(*BRAND_NAVY)
    pdf.multi_cell(0, 9, title)
    pdf.ln(4)

    for heading, bullets in sections:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*BRAND_NAVY)
        pdf.cell(0, 7, heading, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(30, 41, 59)
        for item in bullets:
            pdf.set_x(pdf.l_margin + 4)
            pdf.multi_cell(0, 5.5, f"  -  {item}")
        pdf.ln(3)

    pdf.output(str(path))


def write_mockup_png(path: Path, title: str, subtitle: str, colour: tuple[int, int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    w, h = 960, 540
    img = Image.new("RGB", (w, h), colour)
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, w, 52], fill=BRAND_NAVY)
    try:
        logo = Image.open(ensure_logo_png()).convert("RGBA")
        logo.thumbnail((140, 36), Image.Resampling.LANCZOS)
        img.paste(logo, (20, 8), logo)
    except OSError:
        draw.text((20, 16), "Nestlancer", fill=(255, 255, 255))

    draw.text((w - 180, 18), "Deliverable Preview", fill=(200, 200, 220))

    for y0 in (80, 220, 420):
        draw.rounded_rectangle((40, y0, w - 40, y0 + 120), radius=8, fill=(255, 255, 255), outline=(200, 200, 200), width=2)

    try:
        font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except OSError:
        font_lg = ImageFont.load_default()
        font_sm = ImageFont.load_default()

    draw.text((60, 110), title, fill=(40, 40, 40), font=font_lg)
    draw.text((60, 145), subtitle, fill=(100, 100, 100), font=font_sm)
    img.save(path, "PNG")


def write_pr_markdown(path: Path, pr_number: int, title: str, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        textwrap.dedent(
            f"""\
            # PR-{pr_number:03d}: {title}

            | Field | Value |
            |-------|-------|
            | Status | Merged |
            | Author | Platform Engineering |

            ## Summary
            {body}

            ## Changes
            - Implementation complete and code-reviewed
            - Unit and integration tests added
            - Staging deployment verified

            ## Test plan
            - [x] Manual QA on staging
            - [x] Regression suite passing
            """
        )
    )


def write_zip_bundle(path: Path, project_name: str, files: dict[str, str], *, wip: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
        if wip:
            zf.writestr(
                "README.md",
                textwrap.dedent(
                    f"""\
                    # {project_name} — staging review

                    This bundle is the current staging build for client review.
                    It is not the final production handoff.

                    Generated: {TODAY}
                    """
                ),
            )
            zf.writestr(
                "REVIEW.md",
                "Please review the staging flows and reply in the project thread with feedback.",
            )
        else:
            zf.writestr(
                "README.md",
                f"# {project_name}\n\nFinal delivery bundle.\n\nGenerated: {TODAY}\n",
            )


def doc_number_from_path(rel_path: str) -> str:
    digest = abs(hash(rel_path)) % 9000 + 1000
    return f"NL-2026-{digest}"


# uploader: "user" = plain client file | "admin" = Nestlancer-branded
ASSETS: list[dict] = [
    # Arjun Mehta (braj-wave) — B2B portal (completed) + spice D2C (active)
    {
        "path": "users/arjun-mehta/projects/marketplace-web-app/assets/request-brief.pdf",
        "type": "pdf", "uploader": "user",
        "title": "B2B Wholesale Ordering Portal - Client Brief",
        "author": "Arjun Mehta, Mehta Wholesale Traders",
        "sections": [
            ("Project", ["Gujarat dealer network portal - bulk ordering, GST invoices, Razorpay advance links."]),
            ("Dealers", ["40+ distributors across Ahmedabad and Surat"]),
            ("Budget", ["INR 40,000 - 80,000"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/marketplace-web-app/assets/quote-proposal.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "B2B Wholesale Ordering Portal - Proposal",
        "sections": [
            ("Quote", ["Total: INR 59,000 | 50/50 payment schedule"]),
            ("Scope", ["Dealer onboarding with GSTIN", "Bulk cart with MOQ", "Razorpay payment links", "Fulfilment admin"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/marketplace-web-app/assets/deliverables/milestone-1-handoff.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Dealer Portal MVP - Handoff",
        "sections": [
            ("Delivered", ["Production URLs", "Dealer login guide", "Razorpay webhook setup", "38 dealers onboarded"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/marketplace-web-app/assets/final/nestlancer-marketplace-v1.0.zip",
        "type": "zip", "uploader": "admin", "project": "B2B Wholesale Ordering Portal",
        "files": {
            "api/src/main.ts": "// B2B dealer ordering API\n",
            "docs/DEPLOYMENT.md": "# Dealer Portal Deployment\n",
        },
    },
    {
        "path": "users/arjun-mehta/projects/e-commerce-platform/assets/request-brief.pdf",
        "type": "pdf", "uploader": "user",
        "title": "Khandesh Spice D2C Store - Client Brief",
        "author": "Arjun Mehta, Mehta Wholesale Traders",
        "sections": [
            ("Project", ["D2C masala brand store - variants, Razorpay UPI/COD, Shiprocket delivery, Hindi/English SEO."]),
            ("Launch", ["Target Navratri 2026 sales window"]),
            ("Budget", ["INR 50,000 - 1,00,000"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/e-commerce-platform/assets/quote-proposal.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "Khandesh Spice D2C Store - Proposal",
        "sections": [
            ("Quote", ["Total: INR 75,000 | 30/40/30 schedule"]),
            ("Milestones", ["Design and Shiprocket plan", "Storefront and Razorpay checkout", "QA, Hindi SEO, launch"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/e-commerce-platform/assets/deliverables/milestone-1-wireframes.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Milestone 1 - Wireframes",
        "sections": [
            ("Pages", ["Homepage", "Product listing", "Product detail", "Cart", "Checkout (UPI/COD)"]),
            ("Languages", ["English and Hindi toggle wireframes"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/e-commerce-platform/assets/deliverables/milestone-1-wireframes-revised.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Milestone 1 - Revised Wireframes",
        "sections": [
            ("Revision", ["Guest checkout added on cart and checkout pages"]),
            ("Pages", ["Homepage", "PLP", "PDP", "Cart", "Checkout (UPI/COD/guest)"]),
        ],
    },
    {
        "path": "users/arjun-mehta/projects/e-commerce-platform/assets/deliverables/milestone-2-checkout-staging.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Milestone 2 - Checkout Staging Handoff",
        "sections": [
            ("Delivered", ["Razorpay UPI intent on staging", "COD under INR 2,000", "Shiprocket pincode checker"]),
            ("URLs", ["staging.khandeshspice.nestlancer.dev/checkout"]),
        ],
    },
    # Samira Patel — festive campaign landing pages
    {
        "path": "users/samira-patel/projects/landing-page-suite/assets/request-brief.pdf",
        "type": "pdf", "uploader": "user",
        "title": "Festive Season Campaign Landing Pages - Client Brief",
        "author": "Samira Patel, Patel Digital Marketing",
        "sections": [
            ("Project", ["Navratri, Diwali, and corporate gifting pages - Zoho CRM, Meta Pixel, GA4, Marathi variants."]),
            ("Budget", ["INR 8,000 - 15,000 (fixed price at INR 12,000)"]),
            ("Deadline", ["Live before 10 September 2026"]),
        ],
    },
    {
        "path": "users/samira-patel/projects/landing-page-suite/assets/quote-proposal.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "Festive Campaign Pages - Fixed Price Proposal",
        "sections": [
            ("Quote", ["Total: INR 12,000 | 50% upfront, 50% on delivery"]),
            ("Deliverables", ["3 campaign landing pages", "Zoho CRM integration", "Meta Pixel + GA4 events"]),
        ],
    },
    {
        "path": "users/samira-patel/projects/landing-page-suite/assets/deliverables/milestone-1-designs.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Milestone 1 - Campaign Page Designs",
        "sections": [
            ("Campaigns Delivered", ["Navratri snack brand", "Diwali sweets", "Corporate gifting"]),
            ("Status", ["All live on production", "Zoho leads verified", "Mobile Lighthouse 94"]),
        ],
    },
    {
        "path": "users/samira-patel/projects/landing-page-suite/assets/final/nestlancer-landing-pages-v1.0.zip",
        "type": "zip", "uploader": "admin", "project": "Festive Campaign Landing Pages",
        "files": {
            "pages/navratri/index.html": "<!DOCTYPE html><html><body><h1>Navratri Campaign</h1></body></html>",
            "zoho/forms.json": '{"forms":["navratri","diwali","corporate-gifting"]}',
        },
    },
    # Rahul Desai (alex-rivera) — warehouse ops portal
    {
        "path": "users/rahul-desai/projects/admin-portal-enhancements/assets/request-brief.pdf",
        "type": "pdf", "uploader": "user",
        "title": "Warehouse & Fleet Operations Portal - Client Brief",
        "author": "Rahul Desai, Desai Logistics Solutions",
        "sections": [
            ("Scope", ["Pune and Nashik warehouse inventory", "Fleet GPS via Trakzee", "CSV export", "Audit logs"]),
            ("Budget", ["INR 15,000 - 25,000"]),
        ],
    },
    {
        "path": "users/rahul-desai/projects/admin-portal-enhancements/assets/quote-proposal.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "Warehouse & Fleet Operations Portal - Proposal",
        "sections": [
            ("Quote", ["Total: INR 19,800 | Valid until: 1 August 2026"]),
            ("Payment", ["50% upfront, 50% on delivery"]),
            ("Timeline", ["5 weeks with weekly demos"]),
        ],
    },
    # Ananya Iyer (mei-chen) — Razorpay reconciliation
    {
        "path": "users/ananya-iyer/projects/reconciliation-service/assets/request-brief.pdf",
        "type": "pdf", "uploader": "user",
        "title": "Razorpay Settlement Reconciliation Engine - Client Brief",
        "author": "Ananya Iyer, Iyer FinServ Pvt Ltd",
        "sections": [
            ("Scope", ["Razorpay webhook ingestion", "Settlement ledger matching", "Admin replay UI"]),
            ("Budget", ["INR 40,000 - 55,000"]),
        ],
    },
    {
        "path": "users/ananya-iyer/projects/reconciliation-service/assets/quote-proposal.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "Razorpay Reconciliation Engine - Proposal",
        "sections": [
            ("Quote", ["Total: INR 48,000 | 30/40/30 milestone split"]),
            ("Compliance", ["RBI-compliant - no card data stored, settlement reports only"]),
        ],
    },
    {
        "path": "users/ananya-iyer/projects/reconciliation-service/assets/deliverables/milestone-1-webhook-spec.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Milestone 1 - Razorpay Webhook Specification",
        "sections": [
            ("Events Handled", ["payment.captured", "settlement.processed", "refund.created"]),
            ("Reliability", ["HMAC signature verification", "Idempotency store", "Transactional outbox"]),
        ],
    },
    {
        "path": "users/ananya-iyer/projects/reconciliation-service/assets/pull-requests/PR-001-webhook-receiver.md",
        "type": "pr", "uploader": "admin", "num": 1,
        "pr_title": "Razorpay webhook receiver",
        "body": "HMAC signature verification, idempotency store, and outbox event publishing for settlement events.",
    },
    # Priya Nair — corporate LMS
    {
        "path": "users/priya-nair/projects/training-portal/assets/request-brief.pdf",
        "type": "pdf", "uploader": "user",
        "title": "Corporate LMS for 200 Employees - Client Brief",
        "author": "Priya Nair, Nair Learning Systems",
        "sections": [
            ("Scope", ["LMS for Kochi, Bangalore, Chennai staff", "Course builder, quizzes, PDF certificates", "Okta SAML SSO"]),
            ("Budget", ["INR 35,000 - 50,000"]),
        ],
    },
    {
        "path": "users/priya-nair/projects/training-portal/assets/quote-proposal.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "Corporate LMS - Proposal",
        "sections": [
            ("Quote", ["Total: INR 42,000 | 30/40/30 milestone split"]),
            ("Included", ["LMS platform", "Malayalam subtitle support", "Okta SAML SSO"]),
        ],
    },
    {
        "path": "users/priya-nair/projects/training-portal/assets/quote-proposal-revised.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Proposal",
        "title": "Corporate LMS - Revised Proposal",
        "sections": [
            ("Quote", ["Total: INR 52,200 | CMS add-on split out", "HR dashboard included"]),
            ("Changes", ["Okta SAML timeline extended", "Optional bilingual CMS module"]),
        ],
    },
    {
        "path": "users/priya-nair/projects/training-portal/assets/deliverables/milestone-1-lms-setup.pdf",
        "type": "pdf", "uploader": "admin", "doc_type": "Deliverable",
        "title": "Milestone 1 - LMS Staging Handoff",
        "sections": [
            ("Delivered", ["Staging admin guide", "Course import template", "Quiz engine config"]),
            ("Subtitles", ["Malayalam subtitle workflow on compliance modules"]),
        ],
    },
]


def collect_scenario_asset_paths() -> set[str]:
    paths: set[str] = set()
    flow_root = SCENARIOS_DIR / "users"
    for json_file in flow_root.glob("**/*.json"):
        seed_key = json_file.relative_to(flow_root).parts[0]
        text = json_file.read_text()

        for key in ("attachments", "attachmentFiles", "files"):
            for match in re.finditer(rf'"{key}"\s*:\s*\[(.*?)\]', text, re.DOTALL):
                for path_match in re.finditer(r'"([^"]+\.(pdf|png|md|zip))"', match.group(1)):
                    rel = path_match.group(1)
                    if not rel.startswith("users/"):
                        rel = f"users/{seed_key}/{rel}"
                    paths.add(rel)

        for match in re.finditer(r'"file"\s*:\s*"([^"]+\.(pdf|png|md|zip))"', text):
            rel = match.group(1)
            if not rel.startswith("users/"):
                rel = f"users/{seed_key}/{rel}"
            paths.add(rel)

    return paths


def manifest_paths() -> set[str]:
    return {a["path"] for a in ASSETS}


def clean_stale_files(keep: set[str]) -> None:
    users_root = GENERATED_DIR / "users"
    if not users_root.exists():
        return
    for path in sorted(users_root.glob("**/*"), reverse=True):
        if path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass
            continue
        rel = str(path.relative_to(GENERATED_DIR))
        if rel not in keep:
            path.unlink()
            print(f"[clean] removed {rel}")


def generate_asset(spec: dict) -> None:
    path = GENERATED_DIR / spec["path"]
    kind = spec["type"]

    if kind == "pdf":
        if spec.get("uploader") == "user":
            write_user_pdf(path, spec["title"], spec["author"], spec["sections"])
        else:
            write_admin_pdf(
                path, spec["title"],
                spec.get("doc_type", "Document"),
                doc_number_from_path(spec["path"]),
                spec["sections"],
            )
    elif kind == "png":
        write_mockup_png(path, spec["title"], spec["subtitle"], spec["colour"])
    elif kind == "pr":
        write_pr_markdown(path, spec["num"], spec["pr_title"], spec["body"])
    elif kind == "zip":
        write_zip_bundle(
            path, spec["project"], spec["files"],
            wip=bool(spec.get("wip")),
        )
    else:
        raise ValueError(f"Unknown asset type: {kind}")

    tag = spec.get("uploader", "?")
    print(f"[assets] ({tag}) {spec['path']}")


def ascii_safe(text: str) -> str:
    return text.replace("—", "-").replace("'", "'").replace(""", '"').replace(""", '"')


def infer_asset_spec(rel_path: str) -> dict:
    """Build a generic asset spec for scenario-referenced paths not in ASSETS."""
    parts = Path(rel_path).parts
    seed_key = parts[1] if len(parts) > 1 and parts[0] == "users" else "client"
    name = Path(rel_path).name
    title_base = ascii_safe(name.replace("-", " ").replace(".pdf", "").replace(".zip", "").title())

    if "/wip/" in rel_path or name.endswith("-wip.zip") or "staging-wip" in name:
        project = Path(rel_path).parent.parent.name
        return {
            "path": rel_path,
            "type": "zip",
            "uploader": "admin",
            "project": project,
            "wip": True,
            "files": {"staging-config.json": '{"environment":"staging","complete":false}'},
        }
    if name.endswith(".zip"):
        project = Path(rel_path).parent.parent.name if "final" in rel_path else Path(name).stem
        return {
            "path": rel_path,
            "type": "zip",
            "uploader": "admin",
            "project": project,
            "files": {"RELEASE-NOTES.txt": f"Delivery bundle for {project}."},
        }
    if "request-brief" in name:
        return {
            "path": rel_path,
            "type": "pdf",
            "uploader": "user",
            "title": f"{title_base} - Client Brief",
            "author": f"Client ({seed_key})",
            "sections": [("Scope", ["Requirements as described in the platform request."]), ("Budget", ["INR - flexible"])],
        }
    if "quote-proposal" in name:
        return {
            "path": rel_path,
            "type": "pdf",
            "uploader": "admin",
            "doc_type": "Proposal",
            "title": title_base,
            "sections": [("Quote", ["Milestone-based INR pricing"]), ("Terms", ["Standard Nestlancer delivery terms"])],
        }
    if "/deliverables/" in rel_path:
        return {
            "path": rel_path,
            "type": "pdf",
            "uploader": "admin",
            "doc_type": "Deliverable",
            "title": title_base,
            "sections": [("Delivered", ["Staging access", "Documentation", "Handoff notes"])],
        }
    if name.endswith(".md"):
        return {
            "path": rel_path,
            "type": "pr",
            "uploader": "admin",
            "num": 1,
            "pr_title": title_base,
            "body": "Implementation notes for milestone delivery.",
        }
    return {
        "path": rel_path,
        "type": "pdf",
        "uploader": "admin",
        "doc_type": "Document",
        "title": title_base,
        "sections": [("Content", ["Generated for demo seed."])],
    }


def build_asset_list() -> list[dict]:
    referenced = collect_scenario_asset_paths()
    defined = {a["path"]: a for a in ASSETS}
    for path in sorted(referenced):
        if path not in defined:
            defined[path] = infer_asset_spec(path)
    return list(defined.values())


def validate_manifest() -> list[dict]:
    assets = build_asset_list()
    referenced = collect_scenario_asset_paths()
    defined_paths = {a["path"] for a in assets}
    missing = referenced - defined_paths
    if missing:
        raise SystemExit(
            "Assets referenced in scenario.json but could not be inferred:\n  "
            + "\n  ".join(sorted(missing))
        )
    extra_static = set(manifest_paths()) - referenced
    if extra_static:
        print(f"[warn] Static ASSETS not referenced in scenarios (will still generate): {len(extra_static)}")
    return assets


def main() -> None:
    assets = validate_manifest()
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    keep = {a["path"] for a in assets}
    clean_stale_files(keep)
    ensure_logo_png()

    user_count = sum(1 for a in assets if a.get("uploader") == "user")
    admin_count = len(assets) - user_count

    for spec in assets:
        generate_asset(spec)

    print(
        f"[assets] Done. {len(assets)} files ({user_count} user-style, {admin_count} admin-branded) "
        f"→ {GENERATED_DIR.relative_to(PROD_DATA_DIR)}/"
    )


if __name__ == "__main__":
    main()
