"""
test_db.py — Quick database diagnostic
Run: python test_db.py
Tests whether Supabase can accept a row and whether the API reads it back.
"""
import sys, os, requests

sys.path.insert(0, os.path.dirname(__file__))
import database as db

SEP = "─" * 50
print(SEP)
print("  KingsIQ — Database Test")
print(SEP)

base_url = f"{db.SUPABASE_URL}/rest/v1/ads_transparency_results"

# ── 1. Read table ─────────────────────────────────────────────────────────────
print("\n[1] Reading ads_transparency_results table…")
r = requests.get(base_url, headers=db.HEADERS)
print(f"    HTTP {r.status_code}")
if r.status_code == 200:
    rows = r.json()
    print(f"    ✅ Table exists — {len(rows)} rows currently")
elif r.status_code == 404:
    print("    ❌ TABLE DOES NOT EXIST")
    print("       → Go to Supabase SQL Editor and run:")
    print("""
       DROP TABLE IF EXISTS ads_transparency_results;
       CREATE TABLE ads_transparency_results (
           id              BIGSERIAL PRIMARY KEY,
           advertiser      TEXT NOT NULL,
           domain          TEXT NOT NULL,
           ad_count        INTEGER NOT NULL DEFAULT 0,
           filter_applied  TEXT NOT NULL DEFAULT 'none',
           ads             JSONB NOT NULL DEFAULT '[]',
           scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now()
       );
       """)
    sys.exit(1)
else:
    print(f"    ❌ Unexpected error: {r.text[:300]}")
    sys.exit(1)

# ── 2. Insert a test row ──────────────────────────────────────────────────────
print("\n[2] Inserting a test row…")
test = [{
    "advertiser":     "TEST SCHOOL",
    "domain":         "_test_.com",
    "ad_count":       42,
    "filter_applied": "today",
    "ads":            [{"title": "test ad", "body": "body", "screenshot_url": "/screenshots/test.png", "ad_index": 1}],
    "scraped_at":     "2026-03-28T12:00:00Z",
}]
r2 = requests.post(base_url, headers=db.HEADERS, json=test)
print(f"    HTTP {r2.status_code}")
if r2.status_code in (200, 201):
    print("    ✅ Insert succeeded!")
else:
    print(f"    ❌ INSERT FAILED: {r2.text[:400]}")
    print("\n    This likely means the table has wrong columns.")
    print("    Run the DROP/CREATE SQL above and try again.")
    sys.exit(1)

# ── 3. Read it back ───────────────────────────────────────────────────────────
print("\n[3] Reading it back…")
r3 = requests.get(f"{base_url}?domain=eq._test_.com", headers=db.HEADERS)
rows3 = r3.json()
print(f"    HTTP {r3.status_code} — {len(rows3)} row(s)")
if rows3:
    row = rows3[0]
    print(f"    ✅ Row found: advertiser='{row['advertiser']}'  ad_count={row['ad_count']}  filter='{row['filter_applied']}'")
    ads_field = row.get('ads')
    if isinstance(ads_field, list):
        print(f"    ✅ ads column is JSONB array — {len(ads_field)} item(s)")
    else:
        print(f"    ⚠️  ads column type unexpected: {type(ads_field)} — {str(ads_field)[:100]}")

# ── 4. Test API endpoint ──────────────────────────────────────────────────────
print("\n[4] Testing FastAPI endpoint http://localhost:8000/api/ads-transparency/results …")
try:
    r4 = requests.get("http://localhost:8000/api/ads-transparency/results", timeout=5)
    j  = r4.json()
    count = len(j.get("data") or [])
    print(f"    HTTP {r4.status_code} — {count} row(s) returned")
    if count > 0:
        print("    ✅ API is working — data flows from Supabase → API → frontend")
    else:
        print("    ⚠️  API returned 0 rows even though Supabase has data.")
        if j.get("error"):
            print(f"    Error: {j['error']}")
except requests.exceptions.ConnectionError:
    print("    ❌ Backend NOT running on port 8000")
    print("       → Open a terminal in kingsiq/backend and run: uvicorn main:app --reload")

# ── 5. Clean up test row ──────────────────────────────────────────────────────
requests.delete(f"{base_url}?domain=eq._test_.com", headers=db.HEADERS)
print("\n[5] Test row cleaned up.")

print("\n" + SEP)
print("  ✅ Test complete — check results above")
print(SEP)
