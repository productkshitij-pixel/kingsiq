"""
ads_transparency.py — Google Ads Transparency Centre Scraper
Navigates to adstransparency.google.com, clicks the "Any time" date
filter and selects "Today", then captures the CORRECT today-only ad count.
"""
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS_DIR = Path(__file__).parent.parent / "screenshots"
SCREENSHOTS_DIR.mkdir(exist_ok=True)


def clean(t: str) -> str:
    return re.sub(r"\s+", " ", t or "").strip()


def safe_name(domain: str) -> str:
    return re.sub(r"[^\w]", "_", domain)


def parse_ad_count(text: str) -> int:
    m = re.search(r"(\d+)", text or "")
    return int(m.group(1)) if m else 0


async def read_ad_count(page) -> int:
    """Read the current 'X ads' number shown on the page."""
    try:
        await page.wait_for_selector("text=/\\d+ ads/", timeout=10_000)
        text = await page.locator("text=/\\d+ ads/").first.inner_text()
        return parse_ad_count(text)
    except Exception:
        return 0


async def click_today_filter(page) -> bool:
    """
    Click the 'Any time' date dropdown and select 'Today'.
    Returns True if successful.
    The default state of the page is 'Any time'. Clicking it opens a
    dropdown with options: Today / Last 7 days / Last 30 days / Any time.
    """
    try:
        # ── Step 1: click the "Any time" dropdown button ──────────────────────
        # It may appear as exactly "Any time" or inside a larger button
        any_time_locators = [
            page.locator("text=Any time").first,
            page.locator("[aria-label*='time' i]").first,
            page.locator("at-date-filter").first,
            page.locator("[class*='date-filter']").first,
        ]
        opened = False
        for loc in any_time_locators:
            try:
                if await loc.is_visible(timeout=4_000):
                    await loc.click()
                    opened = True
                    print(f"  Clicked date filter dropdown", flush=True)
                    break
            except Exception:
                continue

        if not opened:
            print(f"  ⚠️  Could not find 'Any time' dropdown", flush=True)
            return False

        await asyncio.sleep(1.5)  # wait for dropdown to open

        # ── Step 2: click "Today" from the opened dropdown ────────────────────
        # Only match VISIBLE elements to avoid shadow DOM false positives
        today_locators = [
            page.locator("[role='option']:has-text('Today')").first,
            page.locator("mat-option:has-text('Today')").first,
            page.locator("li:has-text('Today')").first,
            page.locator("span:text-is('Today')").first,
        ]
        clicked_today = False
        for loc in today_locators:
            try:
                if await loc.is_visible(timeout=3_000):
                    await loc.click()
                    clicked_today = True
                    print(f"  Clicked 'Today' option", flush=True)
                    break
            except Exception:
                continue

        if not clicked_today:
            # Last resort: find any visible element with exactly "Today"
            try:
                await page.click("text=Today", timeout=3_000)
                clicked_today = True
                print(f"  Clicked 'Today' (fallback)", flush=True)
            except Exception:
                print(f"  ⚠️  Could not click 'Today' option", flush=True)
                return False

        await asyncio.sleep(1)

        # ── Step 3: click OK to confirm the date selection ────────────────────
        ok_locators = [
            page.locator("button:has-text('OK')").first,
            page.locator("button:text-is('OK')").first,
            page.locator("[class*='confirm']").first,
            page.locator("text=OK").first,
        ]
        for loc in ok_locators:
            try:
                if await loc.is_visible(timeout=3_000):
                    await loc.click()
                    print(f"  Clicked OK to confirm", flush=True)
                    break
            except Exception:
                continue

        # ── Step 4: wait for page to reload with today's data ─────────────────
        await asyncio.sleep(4)
        return True

    except Exception as e:
        print(f"  ⚠️  click_today_filter error: {e}", flush=True)
        return False


async def scrape_advertiser(page, domain: str, advertiser_name: str) -> dict:
    """
    Navigate to Ads Transparency for this domain.
    1. Read all-time count (to verify page loaded)
    2. Click 'Any time' → 'Today'
    3. Read today-only count
    4. Screenshot individual ad cards
    """
    ads            = []
    ad_count       = 0
    filter_applied = "none"

    # ── No date params in URL — they don't apply the filter ──────────────────
    url = f"https://adstransparency.google.com/?domain={domain}&region=AE"

    try:
        print(f"  → {url}", flush=True)
        await page.goto(url, wait_until="networkidle", timeout=40_000)
        await asyncio.sleep(4)

        # Full-page screenshot before filter (backup)
        page_shot = f"{safe_name(domain)}_page.png"
        await page.screenshot(path=str(SCREENSHOTS_DIR / page_shot), full_page=False)

        # Read the initial all-time count so we can confirm the filter changed
        initial_count = await read_ad_count(page)
        print(f"  All-time count: {initial_count}", flush=True)

        # ── Apply Today filter ────────────────────────────────────────────────
        success = await click_today_filter(page)

        if success:
            # Re-read count after filter applied — this is TODAY's count
            ad_count = await read_ad_count(page)
            filter_applied = "today"
            print(f"  ✅ Today count: {ad_count}  (all-time: {initial_count})", flush=True)
        else:
            # Filter failed — save all-time count but mark as unfiltered
            ad_count       = initial_count
            filter_applied = "none"
            print(f"  ℹ️  Using all-time count: {ad_count}", flush=True)

        # ── Find individual ad cards ──────────────────────────────────────────
        card_selectors = [
            "creative-preview",
            "[class*='creative-preview']",
            "[class*='CreativePreview']",
            "at-creative-preview",
            "mat-card",
            "[data-index]",
            "article",
        ]
        cards = []
        for sel in card_selectors:
            try:
                found = await page.query_selector_all(sel)
                if found:
                    cards = found
                    print(f"  Selector '{sel}' → {len(found)} cards", flush=True)
                    break
            except Exception:
                continue

        # Scroll and retry
        if not cards:
            await page.evaluate("window.scrollTo(0, 400)")
            await asyncio.sleep(2)
            for sel in card_selectors:
                try:
                    found = await page.query_selector_all(sel)
                    if found:
                        cards = found
                        break
                except Exception:
                    continue

        # ── Screenshot each card ──────────────────────────────────────────────
        if cards:
            capped = cards[:20]
            print(f"  Screenshotting {len(capped)} cards…", flush=True)
            for i, card in enumerate(capped):
                try:
                    await card.scroll_into_view_if_needed()
                    await asyncio.sleep(0.4)
                    shot_file = f"{safe_name(domain)}_ad_{i+1}.png"
                    await card.screenshot(path=str(SCREENSHOTS_DIR / shot_file))
                    text  = clean(await card.inner_text())
                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    title = next((l for l in lines if len(l) > 8), advertiser_name)
                    body  = " · ".join(lines[1:3]) if len(lines) > 1 else ""
                    ads.append({
                        "title":          title[:120],
                        "body":           body[:200],
                        "screenshot_url": f"/screenshots/{shot_file}",
                        "ad_index":       i + 1,
                    })
                    print(f"  📸 Ad {i+1}: {title[:55]}", flush=True)
                except Exception as e:
                    print(f"  Card {i+1} error: {e}", flush=True)

        # Fallback: full-page screenshot as single entry
        if not ads and (SCREENSHOTS_DIR / page_shot).exists():
            ads.append({
                "title":          f"{advertiser_name} — Google Ads Transparency",
                "body":           f"adstransparency.google.com · {domain} · UAE",
                "screenshot_url": f"/screenshots/{page_shot}",
                "ad_index":       0,
            })

    except Exception as e:
        print(f"  Error scraping {domain}: {e}", flush=True)

    return {
        "advertiser":      advertiser_name,
        "ad_count":        ad_count,        # today-only count (or all-time if filter failed)
        "total_ad_count":  initial_count,   # all-time count always
        "filter_applied":  filter_applied,
        "ads":             ads,
    }


async def run_ads_transparency_scrape(advertisers: list[dict]) -> dict:
    results = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
                "--lang=en-US",
            ],
            ignore_default_args=["--enable-automation"],
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )
        page = await context.new_page()

        for item in advertisers:
            name   = item["name"]
            domain = item["domain"]
            print(f"\n── {name} ({domain}) ──", flush=True)
            result = await scrape_advertiser(page, domain, name)
            print(
                f"  → ad_count={result['ad_count']}  "
                f"filter={result['filter_applied']}  "
                f"screenshots={len(result['ads'])}",
                flush=True,
            )
            results[domain] = result
            await asyncio.sleep(2)

        await browser.close()

    return results
