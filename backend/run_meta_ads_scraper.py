"""
run_meta_ads_scraper.py — Scrape Meta Ads Library for all active competitors
that have a meta_ad_link set. Inserts results into meta_ads_results (history kept).

Run manually:
    py -3.12 run_meta_ads_scraper.py

Triggered automatically via POST /api/scrape/meta-ads
"""

import asyncio
import sys
import re
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import database as db
from scrapers.meta_ads_library import scrape_meta_ads

# ── Audience category keyword detection ──────────────────────────────────────

CATEGORY_KEYWORDS = {
    "early_years": [
        "fs1", "fs2", "early years", "nursery", "foundation stage",
    ],
    "primary": [
        "primary", "year 1", "year 2", "year 3", "year 4",
        "year 5", "year 6", "building foundations",
    ],
    "sixth_form": [
        "sixth form", "a levels", "a-levels", "university prep",
        "university preparation", "a level",
    ],
    "open_day": [
        "open day", "open morning", "visit us", "book a tour",
        "register", "schedule a visit",
    ],
    "admissions": [
        "admissions open", "apply now", "apply today", "enrolling now",
        "enrol", "admissions", "applications open",
    ],
    "brand": [
        "excellence", "community", "holistic", "success", "values",
        "reputation", "tradition", "pride",
    ],
}


def detect_category(caption: str) -> str:
    """Auto-classify an ad by matching caption against keyword buckets."""
    if not caption:
        return "others"
    text = caption.lower()
    for cat_id, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return cat_id
    return "others"


async def run():
    print("=" * 60)
    print("[Meta Scraper] Starting Meta Ads Library scrape")
    print("=" * 60)

    # ── 1. Fetch competitors with meta_ad_link ────────────────────────────────
    competitors = db.select("competitors", filters={"is_active": "true"})
    with_links  = [c for c in competitors if c.get("meta_ad_link")]

    print(f"[Meta Scraper] {len(with_links)} / {len(competitors)} competitors have Meta links\n")

    if not with_links:
        print("[Meta Scraper] Nothing to scrape — add meta_ad_link in the Competitors table.")
        return

    scrape_date = date.today().isoformat()
    print(f"[Meta Scraper] Scrape date: {scrape_date}\n")

    all_inserted = 0

    for comp in with_links:
        school_id   = str(comp.get("id", ""))
        school_name = comp.get("name", "Unknown")
        meta_url    = comp.get("meta_ad_link", "")

        print(f"─── {school_name} ───")

        try:
            result = await scrape_meta_ads(
                meta_url    = meta_url,
                school_name = school_name,
                school_id   = school_id,
                scrape_date = scrape_date,
            )

            ads = result.get("ads", [])
            print(f"  → {len(ads)} ads scraped (total shown: {result['ad_count']})")

            if not ads:
                print("  → No ads to save, skipping\n")
                continue

            # ── 2. Auto-detect audience category ─────────────────────────────
            rows = []
            for ad in ads:
                ad["audience_category"] = detect_category(ad.get("caption", ""))
                rows.append(ad)

            # ── 3. Remove any existing rows for this school+date before insert ─
            # This makes re-running Refresh idempotent — no duplicates ever.
            db.delete_rows("meta_ads_results", {
                "school_id":   school_id,
                "scrape_date": scrape_date,
            })

            # ── 4. Insert fresh rows ──────────────────────────────────────────
            db.insert("meta_ads_results", rows)
            all_inserted += len(rows)
            print(f"  → Saved {len(rows)} rows to meta_ads_results\n")

        except Exception as e:
            print(f"  ERROR: {e}\n")
            continue

    print("=" * 60)
    print(f"[Meta Scraper] Done — {all_inserted} ads saved across {len(with_links)} schools")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
