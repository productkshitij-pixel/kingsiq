"""
database.py — Supabase connection using direct REST API calls
No supabase Python library needed — just simple HTTP requests.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def select(table: str, filters: dict = None, order: str = None, limit: int = None) -> list:
    """Read rows from a Supabase table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    if filters:
        for key, value in filters.items():
            params[key] = f"eq.{value}"
    if order:
        params["order"] = order
    if limit:
        params["limit"] = limit
    resp = requests.get(url, headers=HEADERS, params=params)
    resp.raise_for_status()
    return resp.json()


def insert(table: str, rows: list) -> list:
    """Insert one or more rows into a Supabase table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=HEADERS, json=rows)
    resp.raise_for_status()
    return resp.json()


def update(table: str, filters: dict, data: dict):
    """Update rows in a Supabase table matching the filters."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {k: f"eq.{v}" for k, v in filters.items()}
    resp = requests.patch(url, headers=HEADERS, params=params, json=data)
    resp.raise_for_status()
    return resp.json()


def delete_rows(table: str, filters: dict):
    """Delete rows from a table matching ALL given filters (AND logic)."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {k: f"eq.{v}" for k, v in filters.items()}
    resp = requests.delete(url, headers=HEADERS, params=params)
    return resp.status_code in (200, 204)


def delete_month_snapshots(school_id: str, platform: str, year_month: str):
    """
    Delete all snapshots for a school+platform in a given month.
    year_month format: "2026-03"
    Called before saving fresh scrape data so only the latest scrape per month is kept.
    """
    year, month = int(year_month[:4]), int(year_month[5:7])
    start = f"{year}-{month:02d}-01T00:00:00"
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    end = f"{next_year}-{next_month:02d}-01T00:00:00"

    url = f"{SUPABASE_URL}/rest/v1/social_media_snapshots"
    # requests supports list of tuples for duplicate param keys
    params = [
        ("school_id", f"eq.{school_id}"),
        ("platform", f"eq.{platform}"),
        ("scraped_at", f"gte.{start}"),
        ("scraped_at", f"lt.{end}"),
    ]
    resp = requests.delete(url, headers=HEADERS, params=params)
    # 200 or 204 both mean success
    return resp.status_code in (200, 204)
