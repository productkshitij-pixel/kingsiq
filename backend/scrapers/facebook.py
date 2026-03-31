"""
facebook.py — Facebook scraper for KingsIQ
------------------------------------------
What this file does:
  1. Logs into the dummy Facebook account
  2. Visits each Kings' school Facebook page (3 pages)
  3. Visits each competitor's Facebook page (up to 5)
  4. Reads follower/like count and post counts by type
  5. Returns data to be saved to Supabase

Note: Facebook and Instagram are owned by Meta, so login detection
is similar. We use the same human-like approach.
"""

import asyncio
import random
import re
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

FACEBOOK_USERNAME = os.getenv("FACEBOOK_USERNAME")
FACEBOOK_PASSWORD = os.getenv("FACEBOOK_PASSWORD")


# ─── Helper: random human-like delay ───────────────────────────────────────
async def delay(min_ms=800, max_ms=2500):
    await asyncio.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


# ─── Helper: parse count text ──────────────────────────────────────────────
def parse_count(text: str) -> int:
    if not text:
        return 0
    text = text.strip().replace(",", "").replace(" ", "").replace("\u00a0", "")
    try:
        if "M" in text or "m" in text:
            return int(float(re.sub(r"[Mm]", "", text)) * 1_000_000)
        elif "K" in text or "k" in text:
            return int(float(re.sub(r"[Kk]", "", text)) * 1_000)
        else:
            return int(float(re.sub(r"[^\d\.]", "", text) or "0"))
    except Exception:
        return 0


# ─── Step 1: Log in to Facebook ────────────────────────────────────────────
async def login(page):
    """
    Opens facebook.com and signs in with the dummy account.
    """
    print("  → Navigating to Facebook login...")
    await page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
    await delay(3000, 5000)

    # Accept cookies if shown (common in EU/Middle East)
    try:
        accept = page.get_by_role("button", name=re.compile("accept all|allow all|ok", re.IGNORECASE))
        if await accept.count() > 0:
            await accept.first.click()
            await delay(1000, 2000)
    except Exception:
        pass

    # Type email
    print("  → Entering credentials...")
    email_field = await page.wait_for_selector('input[name="email"]', timeout=15000)
    await email_field.click()
    await delay(400, 800)
    for char in FACEBOOK_USERNAME:
        await email_field.type(char, delay=random.randint(60, 150))

    await delay(500, 1000)

    # Type password
    pass_field = await page.query_selector('input[name="pass"]')
    await pass_field.click()
    await delay(300, 700)
    for char in FACEBOOK_PASSWORD:
        await pass_field.type(char, delay=random.randint(60, 150))

    await delay(600, 1200)

    # Click Log In
    login_btn = await page.query_selector('button[name="login"]')
    if not login_btn:
        login_btn = await page.query_selector('[data-testid="royal_login_button"]')
    if login_btn:
        await login_btn.click()

    print("  → Waiting for Facebook login to complete...")
    await delay(6000, 9000)

    logged_in = "facebook.com" in page.url and "login" not in page.url
    print(f"  → Login {'successful' if logged_in else 'FAILED — check credentials'}")
    return logged_in


# ─── Step 2: Scrape a single Facebook page ─────────────────────────────────
async def scrape_page(page, page_url: str, school_name: str) -> dict:
    """
    Visits a Facebook page and extracts:
    - Follower/like count
    - Post count by type (Video, Photo/Static, Shared/Other)
    """
    print(f"  → Scraping Facebook: {school_name}")

    await page.goto(page_url, wait_until="domcontentloaded")
    await delay(4000, 6000)

    result = {
        "follower_count": 0,
        "post_count_reel": 0,       # Videos / Reels on Facebook
        "post_count_carousel": 0,   # Photo albums
        "post_count_static": 0,     # Single photo posts
        "post_count_story": 0,      # Stories (hard to count, left as 0)
        "source_url": page_url,
    }

    # ── Extract follower count ──────────────────────────────────────────────
    try:
        # Facebook shows "X followers" or "X likes" on the page
        # Look for the followers text
        content = await page.content()

        # Try multiple patterns
        patterns = [
            r"([\d,\.]+[KkMm]?)\s*[Ff]ollowers",
            r"([\d,\.]+[KkMm]?)\s*people\s*follow",
            r"([\d,\.]+[KkMm]?)\s*[Ll]ikes",
        ]
        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                result["follower_count"] = parse_count(match.group(1))
                break

        # Fallback: look for it in visible text
        if result["follower_count"] == 0:
            follower_elements = await page.query_selector_all('[data-testid*="follower"], [aria-label*="follower"]')
            for el in follower_elements:
                text = await el.inner_text()
                match = re.search(r"([\d,\.]+[KkMm]?)", text)
                if match:
                    result["follower_count"] = parse_count(match.group(1))
                    break

    except Exception as e:
        print(f"    ⚠ Could not read follower count: {e}")

    # ── Count recent posts by type ──────────────────────────────────────────
    try:
        # Scroll down a bit to load more posts
        await page.evaluate("window.scrollBy(0, 800)")
        await delay(2000, 3000)
        await page.evaluate("window.scrollBy(0, 800)")
        await delay(2000, 3000)

        # Find post containers
        # Facebook posts typically have role="article"
        posts = await page.query_selector_all('[role="article"]')
        print(f"    Found {len(posts)} post containers")

        for post in posts[:30]:  # Check up to 30 recent posts
            post_html = await post.inner_html()
            post_text = await post.inner_text()

            # Check if it's a video/reel post
            has_video = await post.query_selector("video") is not None
            if not has_video:
                has_video = bool(re.search(r'aria-label="[^"]*[Vv]ideo|[Rr]eel', post_html))

            # Check if it's a photo album (multiple images)
            has_album = bool(re.search(r'aria-label="[^"]*[Pp]hoto\s+\d|[Aa]lbum|[Mm]ultiple', post_html))

            if has_video:
                result["post_count_reel"] += 1
            elif has_album:
                result["post_count_carousel"] += 1
            else:
                # Single photo or text post — count as static
                has_image = await post.query_selector("img[src*='scontent']") is not None
                if has_image:
                    result["post_count_static"] += 1

    except Exception as e:
        print(f"    ⚠ Could not count post types: {e}")

    print(f"    ✓ {school_name}: {result['follower_count']:,} followers | "
          f"Videos: {result['post_count_reel']} | "
          f"Albums: {result['post_count_carousel']} | "
          f"Photos: {result['post_count_static']}")

    return result


# ─── Main: run the full Facebook scrape ───────────────────────────────────
async def run_facebook_scrape(schools: list) -> list:
    """
    schools = list of dicts with: id, name, type, facebook_page_url
    Returns list of snapshot dicts ready to insert into Supabase.
    """
    print("\n👥 Starting Facebook scrape...")
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 768},
        )
        page = await context.new_page()
        await page.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        # Log in
        logged_in = await login(page)
        if not logged_in:
            print("  ✗ Facebook login failed. Stopping scrape.")
            await browser.close()
            return []

        # Scrape each school page
        for school in schools:
            fb_url = school.get("facebook_page_url")
            if not fb_url:
                print(f"  ⚠ No Facebook URL for {school['name']} — skipping")
                continue

            await delay(3000, 6000)  # Pause between pages
            data = await scrape_page(page, fb_url, school["name"])

            if data:
                results.append({
                    "school_type": school["type"],
                    "school_name": school["name"],
                    "school_id": school["id"],
                    "platform": "facebook",
                    "facebook_page_name": school["name"],
                    "follower_count": data["follower_count"],
                    "post_count_reel": data["post_count_reel"],
                    "post_count_carousel": data["post_count_carousel"],
                    "post_count_static": data["post_count_static"],
                    "post_count_story": 0,
                    "source_url": data["source_url"],
                })

        await browser.close()

    print(f"✓ Facebook scrape complete — {len(results)} pages scraped\n")
    return results
