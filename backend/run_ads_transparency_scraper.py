"""
run_ads_transparency_scraper.py
Entry point for the Google Ads Transparency scraper.
Run via: python run_ads_transparency_scraper.py
"""
import asyncio
import sys
import os
import requests
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

import database as db
from scrapers.ads_transparency import run_ads_transparency_scrape

# ── Competitor domains to scrape ─────────────────────────────────────────────
# Add / edit these as needed. Domain must match what's registered in Google Ads.
DEFAULT_ADVERTISERS = [
    {"name": "Repton Dubai",          "domain": "reptondubai.org"},
    {"name": "JESS Dubai",            "domain": "jess.sch.ae"},
    {"name": "Repton Al Barsha",      "domain": "reptonalbarsha.org"},
    {"name": "GEMS Sri",              "domain": "gems-sri.com"},
    {"name": "DBS Dubai",             "domain": "dubaibritishschool.ae"},
]


def save_results(results: dict):
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for domain, data in results.items():
        rows.append({
            "advertiser":     data["advertiser"],
            "domain":         domain,
            "ad_count":       data.get("ad_count", 0),
            "total_ad_count": data.get("total_ad_count", 0),
            "filter_applied": data.get("filter_applied", "none"),
            "ads":            data["ads"],
            "scraped_at":     now,
        })

    if not rows:
        print("No results to save.")
        return

    base_url = f"{db.SUPABASE_URL}/rest/v1/ads_transparency_results"

    # ── Step 1: Delete existing rows for these domains ────────────────────────
    # Build a filter like: domain=in.(reptondubai.org,jess.sch.ae,...)
    domain_list = ",".join(r["domain"] for r in rows)
    del_url = f"{base_url}?domain=in.({domain_list})"
    del_resp = requests.delete(del_url, headers=db.HEADERS)
    if del_resp.status_code not in (200, 204):
        print(f"  ⚠️  Delete warning {del_resp.status_code}: {del_resp.text}")
    else:
        print(f"  🗑️  Cleared old rows for {len(rows)} domains.")

    # ── Step 2: Insert fresh rows ─────────────────────────────────────────────
    resp = requests.post(base_url, headers=db.HEADERS, json=rows)

    if resp.status_code in (200, 201):
        print(f"✅ Saved {len(rows)} advertisers to Supabase.")
    else:
        print(f"❌ Save error {resp.status_code}: {resp.text}")


async def main():
    print("=" * 55)
    print("  KingsIQ — Google Ads Transparency Scraper")
    print("=" * 55)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    results = await run_ads_transparency_scrape(DEFAULT_ADVERTISERS)

    total = sum(len(v["ads"]) for v in results.values())
    print(f"\nDone — {len(results)} advertisers, {total} ads found.")
    save_results(results)


if __name__ == "__main__":
    asyncio.run(main())
