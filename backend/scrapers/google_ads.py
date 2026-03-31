"""
google_ads.py — Google Live Search Ad Scraper (SerpAPI)
Uses SerpAPI to fetch Google search results for Dubai location.
No browser, no bot detection issues.
"""
import time
import random
from serpapi import GoogleSearch

# ─── API Key ─────────────────────────────────────────────────────────────────

SERPAPI_KEY = "26d1adb3b66cd50e7b6c70057656a3466d103522880e28c962a2b6badd3ce492"

# ─── Keyword Definitions ─────────────────────────────────────────────────────

GENERAL_KEYWORDS = [
    "British School in Dubai",
    "School in Dubai",
    "Best schools in Dubai",
    "Top British School Dubai",
    "Top schools in Dubai",
]

BRAND_KEYWORDS = [
    "Kings school",
    "Kings Education",
    "Kings' School",
    "Kings' education Dubai",
    "Kings School Dubai",
    "Kings school Nad al Sheba",
    "Kings School Al Barsha",
    "Kings' School Dubai",
    "Kings' school Nad al Sheba",
    "Kings' School Al Barsha",
]


# ─── Core scrape function ─────────────────────────────────────────────────────

def scrape_keyword(keyword: str) -> list[dict]:
    """
    Search Google for a keyword 3 times via SerpAPI (Dubai, UAE location).
    Collects all sponsored ads from top and bottom positions across all 3 loads.
    Returns deduplicated list of {headline, domain, position}.
    """
    all_advertisers: dict[str, dict] = {}

    for attempt in range(3):
        try:
            print(f"  [{keyword}] Load {attempt + 1}/3 …", flush=True)

            params = {
                "engine": "google",
                "q": keyword,
                "location": "Dubai, United Arab Emirates",
                "gl": "ae",
                "hl": "en",
                "num": 10,
                "api_key": SERPAPI_KEY,
            }

            search = GoogleSearch(params)
            results = search.get_dict()

            # Check for API errors
            if "error" in results:
                print(f"  SerpAPI error: {results['error']}", flush=True)
                break

            # Top ads
            for ad in results.get("ads", []):
                headline = ad.get("title", "").strip()
                domain   = ad.get("displayed_link", "").strip()
                key = headline or domain
                if key and key not in all_advertisers:
                    all_advertisers[key] = {
                        "headline": headline,
                        "domain":   domain,
                        "position": "top",
                    }

            # Bottom ads
            for ad in results.get("ads_bottom", []):
                headline = ad.get("title", "").strip()
                domain   = ad.get("displayed_link", "").strip()
                key = headline or domain
                if key and key not in all_advertisers:
                    all_advertisers[key] = {
                        "headline": headline,
                        "domain":   domain,
                        "position": "bottom",
                    }

            count = len(results.get("ads", [])) + len(results.get("ads_bottom", []))
            print(f"  [{keyword}] Found {count} ads on attempt {attempt + 1}", flush=True)

        except Exception as e:
            print(f"  [{keyword}] Error on attempt {attempt + 1}: {e}", flush=True)

        # Small delay between loads
        time.sleep(random.uniform(1.5, 3.0))

    return list(all_advertisers.values())


# ─── Main entry ───────────────────────────────────────────────────────────────

def run_google_ads_scrape(competitive_keywords: list[str] = None) -> dict:
    """
    Run full scrape across all three keyword groups.
    Returns { keyword -> {keyword_type, advertisers: [...]} }
    """
    competitive_keywords = competitive_keywords or []

    keyword_map = {}
    for kw in GENERAL_KEYWORDS:
        keyword_map[kw] = "general"
    for kw in competitive_keywords:
        keyword_map[kw] = "competitive"
    for kw in BRAND_KEYWORDS:
        keyword_map[kw] = "brand"

    results = {}

    for keyword, kw_type in keyword_map.items():
        print(f"\nScraping [{kw_type}]: {keyword}", flush=True)
        advertisers = scrape_keyword(keyword)
        results[keyword] = {
            "keyword_type": kw_type,
            "advertisers":  advertisers,
        }
        # Polite delay between keywords
        time.sleep(random.uniform(1.0, 2.0))

    return results


if __name__ == "__main__":
    import json
    res = run_google_ads_scrape()
    print(json.dumps(res, indent=2))
