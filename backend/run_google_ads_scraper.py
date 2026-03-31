"""
run_google_ads_scraper.py
Standalone entry point for the Google Live Search scraper (SerpAPI).
Fetches competitor names from DB, runs the scrape, saves to google_ads_live table.
Run via:  python run_google_ads_scraper.py
"""
import sys
import os
import requests
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

import database as db
from scrapers.google_ads import run_google_ads_scrape


def get_competitive_keywords() -> list[str]:
    """Fetch competitor school names from the DB to use as keywords."""
    try:
        competitors = db.select("schools", order="name.asc")
        return [c["name"] for c in competitors if c.get("name")]
    except Exception as e:
        print(f"Could not fetch competitors: {e}")
        return []


def save_results(results: dict):
    """Upsert each keyword result into google_ads_live (one row per keyword)."""
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for keyword, data in results.items():
        rows.append({
            "keyword":      keyword,
            "keyword_type": data["keyword_type"],
            "advertisers":  data["advertisers"],
            "scraped_at":   now,
        })

    if not rows:
        print("No results to save.")
        return

    # Upsert: on_conflict=keyword means UPDATE if keyword already exists
    url     = f"{db.SUPABASE_URL}/rest/v1/google_ads_live?on_conflict=keyword"
    headers = {**db.HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"}
    resp    = requests.post(url, headers=headers, json=rows)

    if resp.status_code in (200, 201):
        print(f"✅ Saved {len(rows)} keyword results to Supabase.")
    else:
        print(f"❌ Save error {resp.status_code}: {resp.text}")


def main():
    print("=" * 55)
    print("  KingsIQ — Google Live Search Scraper (SerpAPI)")
    print("=" * 55)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    competitive_kws = get_competitive_keywords()
    print(f"Competitive keywords from DB: {competitive_kws}\n")

    results = run_google_ads_scrape(competitive_keywords=competitive_kws)

    total_ads = sum(len(v["advertisers"]) for v in results.values())
    print(f"\n{'='*55}")
    print(f"Scrape complete — {len(results)} keywords, {total_ads} unique ads found.")
    print(f"{'='*55}\n")

    save_results(results)
    print("\nDone ✅")


if __name__ == "__main__":
    main()
