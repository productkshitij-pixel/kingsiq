"""
test_serpapi.py — Debug script to check what SerpAPI returns for ONE keyword.
Run: python test_serpapi.py
"""
import json
from serpapi import GoogleSearch

API_KEY = "26d1adb3b66cd50e7b6c70057656a3466d103522880e28c962a2b6badd3ce492"
KEYWORD = "Best schools in Dubai"

print(f"Testing SerpAPI for: '{KEYWORD}'")
print("=" * 55)

params = {
    "engine": "google",
    "q": KEYWORD,
    "location": "Dubai, United Arab Emirates",
    "gl": "ae",
    "hl": "en",
    "num": 10,
    "api_key": API_KEY,
}

search = GoogleSearch(params)
results = search.get_dict()

# Show top-level keys returned
print("\nTop-level keys in response:")
for key in results.keys():
    print(f"  - {key}")

# Show ads specifically
print(f"\nTop ads (results['ads']): {len(results.get('ads', []))} found")
for i, ad in enumerate(results.get("ads", [])):
    print(f"  Ad {i+1}: {json.dumps(ad, indent=4)}")

print(f"\nBottom ads (results['ads_bottom']): {len(results.get('ads_bottom', []))} found")
for i, ad in enumerate(results.get("ads_bottom", [])):
    print(f"  Ad {i+1}: {json.dumps(ad, indent=4)}")

# Show organic results to confirm it's working
print(f"\nOrganic results: {len(results.get('organic_results', []))} found")
for r in results.get("organic_results", [])[:3]:
    print(f"  - {r.get('title', '')} | {r.get('displayed_link', '')}")

# Show search metadata
print(f"\nSearch metadata:")
print(f"  {json.dumps(results.get('search_metadata', {}), indent=4)}")

# ── Fetch raw HTML and search for Sponsored content ──────────────────────────
import requests
from bs4 import BeautifulSoup

raw_html_url = results.get("search_metadata", {}).get("raw_html_file")
print(f"\nFetching raw HTML from: {raw_html_url}")

resp = requests.get(raw_html_url)
soup = BeautifulSoup(resp.text, "html.parser")

print("\n=== Scanning raw HTML for 'Sponsored' text ===")
# Find all elements containing "Sponsored"
sponsored_elements = soup.find_all(string=lambda t: t and "Sponsored" in t)
for el in sponsored_elements:
    parent = el.parent
    print(f"\nFound 'Sponsored' in <{parent.name}> class={parent.get('class')}")
    # Show surrounding context
    container = parent
    for _ in range(5):
        container = container.parent
        if not container:
            break
        text = container.get_text(separator=" | ", strip=True)[:300]
        if len(text) > 50:
            print(f"  Context: {text}")
            break

# Show any errors
if "error" in results:
    print(f"\nERROR: {results['error']}")
