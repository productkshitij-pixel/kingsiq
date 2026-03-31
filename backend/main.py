"""
main.py — KingsIQ Backend API
"""
import sys
import os
import subprocess
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import database as db

app = FastAPI(title="KingsIQ API", version="1.0.0")

# Serve ad screenshots as static files → http://localhost:8000/screenshots/file.png
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"
SCREENSHOTS_DIR.mkdir(exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR)), name="screenshots")

FRONTEND_URL = os.getenv("FRONTEND_URL", "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        # Vercel preview and production URLs
        "https://kingsiq.vercel.app",
        "https://*.vercel.app",
        # Custom domain (set FRONTEND_URL env var on Railway if you add one)
        *([FRONTEND_URL] if FRONTEND_URL else []),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "KingsIQ API is running", "version": "1.0.0"}


class ScrapeRequest(BaseModel):
    month: Optional[str] = None   # e.g. "2026-02" — omit for current month


@app.post("/api/scrape/module1")
def trigger_module1_scrape(body: ScrapeRequest = ScrapeRequest()):
    """
    Launches the scraper as a completely separate Python process.
    This gives Playwright its own event loop — required on Windows.
    Pass {"month": "2026-02"} in the request body to scrape a historical month.
    """
    scraper_path = str(__file__).replace("main.py", "run_scraper.py")
    args = [sys.executable, scraper_path]
    if body.month:
        args.append(body.month)   # run_scraper.py reads sys.argv[1]
    subprocess.Popen(args)
    month_label = body.month or "current month"
    return {"message": f"Module 1 scrape started for {month_label}. This takes 3–5 minutes."}


@app.get("/api/scrape/status")
def get_scrape_status():
    data = db.select("scrape_logs", filters={"module": "module1"}, order="started_at.desc", limit=1)
    return {"log": data[0] if data else None}


@app.get("/api/module1/latest")
def get_module1_latest():
    data = db.select("social_media_snapshots", order="scraped_at.desc", limit=100)
    return {"data": data}


# ─── Google Ads Live Search ──────────────────────────────────────────────────

@app.post("/api/scrape/google-ads")
def trigger_google_ads_scrape():
    """Launch Google Live Search scraper as a separate process."""
    scraper_path = str(__file__).replace("main.py", "run_google_ads_scraper.py")
    subprocess.Popen([sys.executable, scraper_path])
    return {"message": "Google Ads scrape started. Takes 5–10 minutes (3 loads × all keywords)."}


@app.get("/api/google-ads/results")
def get_google_ads_results():
    """Return all rows from google_ads_live, ordered by keyword_type then keyword."""
    data = db.select("google_ads_live", order="keyword_type.asc,keyword.asc")
    return {"data": data}


# ─── Ads Transparency ────────────────────────────────────────────────────────

@app.post("/api/scrape/ads-transparency")
def trigger_ads_transparency_scrape():
    """Launch Ads Transparency scraper as a separate process."""
    scraper_path = str(__file__).replace("main.py", "run_ads_transparency_scraper.py")
    subprocess.Popen([sys.executable, scraper_path])
    return {"message": "Ads Transparency scrape started. Chrome will open and visit each advertiser."}


@app.get("/api/ads-transparency/results")
def get_ads_transparency_results():
    """Return all rows from ads_transparency_results."""
    try:
        data = db.select("ads_transparency_results", order="advertiser.asc")
        return {"data": data}
    except Exception as e:
        print(f"[ads-transparency/results] ERROR: {e}")
        return {"data": [], "error": str(e)}


# ─── Meta Ads Library ────────────────────────────────────────────────────────

@app.post("/api/scrape/meta-ads")
def trigger_meta_ads_scrape():
    """Launch Meta Ads Library scraper as a separate process."""
    scraper_path = str(__file__).replace("main.py", "run_meta_ads_scraper.py")
    subprocess.Popen([sys.executable, scraper_path])
    return {"message": "Meta Ads scrape started. Browser will open for each competitor."}


@app.get("/api/meta-ads/results")
def get_meta_ads_results(scrape_date: Optional[str] = None):
    """Return meta ads results filtered by scrape_date (default = latest date)."""
    try:
        # Get all distinct dates first to find the latest
        all_rows = db.select("meta_ads_results", order="scrape_date.desc")
        if not all_rows:
            return {"data": [], "dates": [], "selected_date": None}

        dates = sorted(list({r["scrape_date"] for r in all_rows}), reverse=True)
        target_date = scrape_date if scrape_date and scrape_date in dates else dates[0]

        data = [r for r in all_rows if r["scrape_date"] == target_date]
        return {"data": data, "dates": dates, "selected_date": target_date}
    except Exception as e:
        print(f"[meta-ads/results] ERROR: {e}")
        return {"data": [], "dates": [], "selected_date": None, "error": str(e)}


class CategoryUpdate(BaseModel):
    audience_category: str


class AdTypeUpdate(BaseModel):
    ad_type: str


@app.patch("/api/meta-ads/{ad_id}/category")
def update_meta_ad_category(ad_id: str, body: CategoryUpdate):
    """Update audience_category for a specific ad."""
    try:
        db.update("meta_ads_results", filters={"id": ad_id}, data={"audience_category": body.audience_category})
        return {"success": True}
    except Exception as e:
        print(f"[meta-ads/category] ERROR: {e}")
        return {"success": False, "error": str(e)}


@app.patch("/api/meta-ads/{ad_id}/type")
def update_meta_ad_type(ad_id: str, body: AdTypeUpdate):
    """Manually override ad_type for a specific ad."""
    allowed = {"Static", "Video", "Carousel"}
    if body.ad_type not in allowed:
        return {"success": False, "error": f"ad_type must be one of {allowed}"}
    try:
        db.update("meta_ads_results", filters={"id": ad_id}, data={"ad_type": body.ad_type})
        return {"success": True}
    except Exception as e:
        print(f"[meta-ads/type] ERROR: {e}")
        return {"success": False, "error": str(e)}
