"""
meta_ads_library.py — Scrape Meta Ads Library for a given competitor URL.

Visits the stored meta_ad_link URL, verifies UAE + All Ads + Active filters,
reads the total ad count, then scrolls to load all ad cards and extracts:
  library_id, started_running, platforms, caption, cta, screenshot, ad_link
"""

import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(__file__).parent.parent / "screenshots" / "meta"

# CTA patterns to detect in ad text
CTA_PATTERNS = [
    "Learn more", "Book now", "Book a tour", "Apply now", "Apply today",
    "Enrolling now", "Register now", "Register today", "Sign up",
    "Get in touch", "Contact us", "Watch more", "Download", "Shop now",
    "Find out more", "Discover more",
]


def _extract_number(text: str) -> int:
    """Extract integer from strings like '~11 results' or '5 results'."""
    if not text:
        return 0
    m = re.search(r"[\d,]+", text.replace(",", ""))
    return int(m.group()) if m else 0


async def _scroll_to_load_all(page, max_scrolls: int = 20):
    """Scroll until no new content loads."""
    prev_height = 0
    for _ in range(max_scrolls):
        curr_height = await page.evaluate("document.body.scrollHeight")
        if curr_height == prev_height:
            break
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2500)
        prev_height = curr_height


async def scrape_meta_ads(
    meta_url: str,
    school_name: str,
    school_id: str,
    scrape_date: str,
) -> dict:
    """
    Visit a Meta Ads Library URL and scrape all active ads.

    Returns:
        {
          school_name, school_id, scrape_date,
          ad_count: int,
          filters_ok: {uae, all_ads, active},
          ads: [{ library_id, started_running, platforms, caption, cta,
                  screenshot_url, ad_link, school_id, school_name, scrape_date }]
        }
    """
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            slow_mo=200,
            args=["--start-maximized"],
        )
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="en-GB",
        )
        page = await context.new_page()

        print(f"  [Meta] → {school_name}")
        print(f"  [Meta]   URL: {meta_url[:80]}...")

        # ── 1. Navigate ──────────────────────────────────────────────────────
        try:
            await page.goto(meta_url, wait_until="networkidle", timeout=35000)
        except Exception:
            await page.goto(meta_url, timeout=35000)
        await page.wait_for_timeout(3000)

        # ── Zoom to 75% so more card content is visible in each screenshot ───
        await page.evaluate("document.documentElement.style.zoom = '0.75'")
        await page.wait_for_timeout(800)

        # ── 2. Verify filters ────────────────────────────────────────────────
        page_text = (await page.content()).lower()
        filters_ok = {
            "uae":      "united arab" in page_text or "country=ae" in meta_url.lower(),
            "all_ads":  "all ads" in page_text or "ad_type=all" in meta_url.lower(),
            "active":   "active ads" in page_text or "active_status=active" in meta_url.lower(),
        }
        print(f"  [Meta]   Filters: {filters_ok}")

        # ── 3. Read total ad count ───────────────────────────────────────────
        ad_count = 0
        try:
            count_el = page.locator("text=/~?\\d+ results?/i").first
            count_text = await count_el.text_content(timeout=6000)
            ad_count = _extract_number(count_text)
            print(f"  [Meta]   Ad count: {ad_count}")
        except Exception as e:
            print(f"  [Meta]   Could not read count: {e}")

        # ── 4. Scroll to load all cards ──────────────────────────────────────
        print(f"  [Meta]   Scrolling to load all ads…")
        await _scroll_to_load_all(page, max_scrolls=15)
        await page.wait_for_timeout(1500)

        # ── 5. Find all ad cards by Library ID text ──────────────────────────
        all_divs = await page.locator("div").all()
        seen_ids = set()
        ad_cards = []  # list of (library_id, locator)

        for div in all_divs:
            try:
                text = await div.text_content(timeout=1000)
                if not text or "Library ID:" not in text:
                    continue
                m = re.search(r"Library ID:\s*(\d{10,})", text)
                if not m:
                    continue
                lib_id = m.group(1)
                if lib_id in seen_ids:
                    continue
                # Only accept divs that are a single card (contain exactly one Library ID)
                if text.count("Library ID:") != 1:
                    continue
                seen_ids.add(lib_id)
                ad_cards.append((lib_id, div))
            except Exception:
                continue

        print(f"  [Meta]   Found {len(ad_cards)} ad cards")

        # ── 6. Extract data from each card ───────────────────────────────────
        ads = []
        for lib_id, card in ad_cards:
            try:
                text = await card.text_content(timeout=2000)
                if not text:
                    continue

                # Started running date
                date_m = re.search(
                    r"Started running on\s+(.+?)(?:\n|Platforms|Library ID)", text
                )
                started_running = date_m.group(1).strip() if date_m else ""

                # Platforms — detect Facebook / Instagram icons via text or aria
                platforms = []
                card_html = await card.inner_html(timeout=2000)
                if "facebook" in card_html.lower() or "fb" in card_html.lower():
                    platforms.append("Facebook")
                if "instagram" in card_html.lower():
                    platforms.append("Instagram")
                # Fallback: check text
                if not platforms:
                    if "facebook" in text.lower():
                        platforms.append("Facebook")
                    if "instagram" in text.lower():
                        platforms.append("Instagram")

                # Caption — text between "Sponsored" and "Library ID:" block
                caption = ""
                cap_m = re.search(
                    r"Sponsored\s*\n*(.*?)(?=Library ID:|See ad details|$)",
                    text, re.DOTALL | re.IGNORECASE,
                )
                if cap_m:
                    raw = cap_m.group(1).strip()
                    # Remove common noise
                    raw = re.sub(r"\s+", " ", raw)
                    caption = raw[:600]

                # CTA
                cta = ""
                text_lower = text.lower()
                for pat in CTA_PATTERNS:
                    if pat.lower() in text_lower:
                        cta = pat
                        break

                # ── Ad type detection ────────────────────────────────────────
                ad_type = "Static"
                card_html_lower = card_html.lower()

                # ── Video: explicit HTML signals then text timestamp ──────────
                if "<video" in card_html_lower:
                    ad_type = "Video"
                elif re.search(r'\d+:\d{2}\s*/\s*\d+:\d{2}', text):
                    # e.g. "0:00 / 1:12" — video duration shown in card text
                    ad_type = "Video"
                elif 'aria-label="play"' in card_html_lower or 'data-video' in card_html_lower:
                    ad_type = "Video"

                # ── Carousel: structural signals only (NOT naive img count) ────
                # Static ads have 2 imgs (logo + creative). Carousel has 4+.
                # Check multiple reliable signals.
                elif (
                    'aria-roledescription="carousel"'  in card_html_lower
                    or 'role="listbox"'                in card_html_lower
                    or 'next card'                     in card_html_lower
                    or 'previous card'                 in card_html_lower
                    or 'aria-label="next"'             in card_html_lower
                    or 'aria-label="previous"'         in card_html_lower
                    or 'aria-label="go to next slide"' in card_html_lower
                    or 'role="listitem"'               in card_html_lower
                    # Multiple <li> items = carousel tile list
                    or card_html_lower.count('<li')    >= 3
                    # Multiple distinct <a href links (logo + 3 tile links)
                    or card_html_lower.count('<a href') >= 4
                    # 4+ imgs = advertiser logo + 3 carousel tiles
                    or card_html_lower.count('<img')   >= 4
                ):
                    ad_type = "Carousel"

                print(f"  [Meta]   {lib_id} → type={ad_type}")

                # Screenshot the card element
                screenshot_filename = f"meta_{school_id}_{lib_id}.png"
                screenshot_path = SCREENSHOTS_DIR / screenshot_filename
                screenshot_url = ""
                try:
                    await card.screenshot(path=str(screenshot_path))
                    screenshot_url = f"/screenshots/meta/{screenshot_filename}"
                except Exception as se:
                    print(f"  [Meta]   Screenshot failed for {lib_id}: {se}")

                ads.append({
                    "school_id":       school_id,
                    "school_name":     school_name,
                    "library_id":      lib_id,
                    "started_running": started_running,
                    "platforms":       platforms,
                    "caption":         caption,
                    "cta":             cta,
                    "ad_type":         ad_type,
                    "screenshot_url":  screenshot_url,
                    "ad_link":         f"https://www.facebook.com/ads/library/?id={lib_id}",
                    "scrape_date":     scrape_date,
                    "audience_category": "",   # filled in by run script
                })

            except Exception as e:
                print(f"  [Meta]   Error on card {lib_id}: {e}")
                continue

        await browser.close()

    return {
        "school_name": school_name,
        "school_id":   school_id,
        "scrape_date": scrape_date,
        "ad_count":    ad_count,
        "filters_ok":  filters_ok,
        "ads":         ads,
    }
