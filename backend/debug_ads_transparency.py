"""
debug_ads_transparency.py
Run: python debug_ads_transparency.py
Shows exactly what is (or isn't) saved in Supabase for ads_transparency_results.
"""
import sys
import os
import json
import requests

sys.path.insert(0, os.path.dirname(__file__))
import database as db

print("=" * 55)
print("  KingsIQ — Ads Transparency Debug")
print("=" * 55)

# ── 1. Check Supabase connection ──────────────────────────────────────────────
print("\n[1] Checking Supabase connection...")
try:
    url  = f"{db.SUPABASE_URL}/rest/v1/ads_transparency_results"
    resp = requests.get(url, headers=db.HEADERS, params={"limit": 1})
    print(f"    Status: {resp.status_code}")
    if resp.status_code == 200:
        print("    ✅ Connected to Supabase.")
    elif resp.status_code == 404:
        print("    ❌ Table 'ads_transparency_results' does NOT exist — please create it in Supabase.")
        print("    SQL to create it:")
        print("""
    CREATE TABLE ads_transparency_results (
        id          BIGSERIAL PRIMARY KEY,
        advertiser  TEXT NOT NULL,
        domain      TEXT NOT NULL,
        ads         JSONB NOT NULL DEFAULT '[]',
        scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
        """)
        sys.exit(1)
    else:
        print(f"    ❌ Unexpected error: {resp.text}")
        sys.exit(1)
except Exception as e:
    print(f"    ❌ Connection failed: {e}")
    sys.exit(1)

# ── 2. Check how many rows exist ──────────────────────────────────────────────
print("\n[2] Checking rows in ads_transparency_results...")
resp = requests.get(url, headers=db.HEADERS)
rows = resp.json()

if not rows:
    print("    ⚠️  Table is EMPTY — no data has been saved yet.")
    print("    → Run: python run_ads_transparency_scraper.py")
else:
    print(f"    ✅ Found {len(rows)} rows:")
    for row in rows:
        ad_count = len(row.get("ads") or [])
        print(f"       • {row.get('advertiser'):30s}  domain={row.get('domain'):25s}  ads={ad_count}  scraped_at={row.get('scraped_at','?')[:19]}")

# ── 3. Check what the API endpoint returns ────────────────────────────────────
print("\n[3] Checking FastAPI endpoint http://localhost:8000/api/ads-transparency/results ...")
try:
    api_resp = requests.get("http://localhost:8000/api/ads-transparency/results", timeout=5)
    api_data = api_resp.json()
    count = len(api_data.get("data") or [])
    print(f"    Status: {api_resp.status_code}  →  {count} rows returned")
    if count == 0:
        print("    ⚠️  API returns 0 rows — either Supabase is empty OR backend is not running.")
    else:
        print("    ✅ API is returning data correctly.")
except requests.exceptions.ConnectionError:
    print("    ❌ Could not reach http://localhost:8000 — is the backend running?")
    print("    → Open a terminal in kingsiq/backend and run: uvicorn main:app --reload")
except Exception as e:
    print(f"    ❌ Error: {e}")

# ── 4. Check screenshots folder ───────────────────────────────────────────────
from pathlib import Path
shots_dir = Path(__file__).parent / "screenshots"
print(f"\n[4] Checking screenshots folder: {shots_dir}")
if not shots_dir.exists():
    print("    ⚠️  Folder does not exist — scraper has never run OR ran from a different directory.")
else:
    files = list(shots_dir.glob("*.png"))
    print(f"    Found {len(files)} PNG files:")
    for f in sorted(files)[:15]:
        size_kb = f.stat().st_size // 1024
        print(f"       • {f.name}  ({size_kb} KB)")
    if len(files) > 15:
        print(f"       … and {len(files) - 15} more")

print("\n" + "=" * 55)
print("  Debug complete.")
print("=" * 55)
