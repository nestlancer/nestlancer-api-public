"""Avatar portrait helpers for demo account seeding."""
from __future__ import annotations

# Used by download_avatar_images.py to pick randomuser.me portrait folders.
FEMALE_FIRST_NAMES = {
    "Samira",
    "Priya",
    "Kavya",
    "Divya",
    "Neha",
    "Pooja",
    "Meera",
    "Anjali",
    "Ishita",
    "Tanvi",
    "Lavanya",
    "Shruti",
    "Nisha",
    "Ritika",
    "Bhavna",
    "Esha",
    "Geeta",
    "Indira",
    "Jyoti",
    "Lata",
    "Ananya",
}


def portrait_gender(first_name: str) -> str:
    return "women" if first_name in FEMALE_FIRST_NAMES else "men"


def portrait_index(seed_key: str, used: set[int]) -> int:
    """Deterministic portrait number 0-99, avoiding duplicates."""
    base = sum(ord(c) for c in seed_key) % 100
    for offset in range(100):
        candidate = (base + offset) % 100
        if candidate not in used:
            return candidate
    return base
