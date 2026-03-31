"""
run_scraper.py — Runs the Module 1 scrape as a standalone process.
This file is launched by main.py as a separate process so that
Playwright has its own event loop, completely separate from FastAPI.

Optional CLI argument: pass a month like "2026-02" to scrape a historical month.
  py -3.12 run_scraper.py             ← scrapes current month
  py -3.12 run_scraper.py 2026-02     ← scrapes February 2026 posts
"""
import asyncio
import sys
from datetime import datetime
import database as db
from scrapers.instagram import run_instagram_scrape
from scrapers.facebook import run_facebook_scrape

# Read optional month argument from command line (passed by main.py for historical scrapes)
TARGET_MONTH = sys.argv[1] if len(sys.argv) > 1 else datetime.utcnow().strftime("%Y-%m")

KINGS_FACEBOOK_PAGES = {
    "Kings' School Dubai": "https://www.facebook.com/KingsSchoolDubai/",
    "Kings' School Al Barsha": "https://www.facebook.com/KingsSchoolAlBarsha/",
    "Kings' School Nad Al Sheba": "https://www.facebook.com/KingsSchoolNadAlSheba/",
}

def get_schools():
    kings = db.select("kings_schools")
    competitors = db.select("competitors", filters={"is_active": "true"})
    schools = []

    # Kings' Education — one shared Instagram account for all three schools.
    # We only add it once (using the first school's ID) to avoid scraping the
    # same profile three times.
    if kings:
        first_king = kings[0]
        schools.append({
            "id": first_king["id"],
            "name": "Kings' Education",
            "type": "kings",
            "instagram_handle": "kings_education",
            "facebook_page_url": None,
        })

    for comp in competitors:
        handle = comp.get("instagram_handle", "")
        if not handle:
            continue   # skip competitors with no Instagram handle
        schools.append({
            "id": comp["id"],
            "name": comp["name"],
            "type": "competitor",
            "instagram_handle": handle,
            "facebook_page_url": comp.get("facebook_page_url"),
        })
    return schools

def log_scrape(status, message=""):
    db.insert("scrape_logs", [{
        "module": "module1",
        "status": status,
        "message": message,
        "completed_at": datetime.utcnow().isoformat() if status != "running" else None,
    }])

async def main():
    print("\n" + "="*50)
    print(f"  KingsIQ — Module 1 Scrape  [{TARGET_MONTH}]")
    print("="*50)
    log_scrape("running", f"Scrape started for {TARGET_MONTH}")

    try:
        schools = get_schools()
        print(f"  Schools to scrape: {len(schools)}")
        all_snapshots = []

        # ── Instagram only for now ──────────────────────────────────────────
        ig_results = await run_instagram_scrape(schools, target_month=TARGET_MONTH)
        all_snapshots.extend(ig_results)

        # Facebook scraping is paused — enable later
        # await asyncio.sleep(5)
        # fb_results = await run_facebook_scrape(schools)
        # all_snapshots.extend(fb_results)

        if all_snapshots:
            # ── Stamp scraped_at correctly for historical months ─────────────────
            # Supabase defaults scraped_at to NOW(), but for historical scrapes
            # we need the timestamp to fall inside the target month so the
            # frontend's month grouping (scraped_at.slice(0,7)) works correctly.
            # We use the last day of the target month at 23:59:59.
            current_month = datetime.utcnow().strftime("%Y-%m")
            if TARGET_MONTH != current_month:
                year, month = int(TARGET_MONTH[:4]), int(TARGET_MONTH[5:7])
                import calendar
                last_day = calendar.monthrange(year, month)[1]
                historical_ts = f"{TARGET_MONTH}-{last_day:02d}T23:59:59"
                for snap in all_snapshots:
                    snap["scraped_at"] = historical_ts
                print(f"  → Historical scrape: stamping records with {historical_ts}")

            # ── Data retention: keep only ONE scrape per school per month ────────
            print(f"  → Clearing old {TARGET_MONTH} data before saving fresh results...")
            for snap in all_snapshots:
                db.delete_month_snapshots(snap["school_id"], snap["platform"], TARGET_MONTH)

            db.insert("social_media_snapshots", all_snapshots)
            print(f"  ✓ Saved {len(all_snapshots)} snapshots")

        log_scrape("success", f"Scraped {len(all_snapshots)} snapshots")
        print(f"\n  ✓ Scrape complete — {len(all_snapshots)} data points saved\n")

    except Exception as e:
        print(f"\n  ✗ Scrape failed: {e}")
        log_scrape("failed", str(e))

if __name__ == "__main__":
    asyncio.run(main())
