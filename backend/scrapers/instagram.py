"""
instagram.py — Instagram scraper for KingsIQ
----------------------------------------
What this file does:
  1. Opens a real Chrome browser using Playwright
  2. Logs into the dummy Instagram account
  3. Visits each school's profile (Kings' + competitors)
  4. Reads follower count and post counts by type
  5. Returns all the data to be saved to Supabase

Why we use a real browser (not an API):
  Instagram has no public API. A real browser with a logged-in account
  is the only reliable way to read this data.
"""

import asyncio
import random
import re
import os
from datetime import datetime
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD")


# ─── Helper: random human-like delay ───────────────────────────────────────
async def delay(min_ms=800, max_ms=2500):
    """Wait a random amount of time so we look like a real human, not a bot."""
    await asyncio.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


# ─── Helper: parse follower text like "1.2M" or "500K" into a number ───────
def parse_count(text: str) -> int:
    if not text:
        return 0
    text = text.strip().replace(",", "").replace(" ", "")
    try:
        if "M" in text or "m" in text:
            return int(float(re.sub(r"[Mm]", "", text)) * 1_000_000)
        elif "K" in text or "k" in text:
            return int(float(re.sub(r"[Kk]", "", text)) * 1_000)
        else:
            return int(float(text))
    except Exception:
        return 0


# ─── Step 1: Log in to Instagram ───────────────────────────────────────────
async def login(page):
    """
    Opens instagram.com/login and signs in with the dummy account.
    We type each character with a random delay to mimic a real person.
    """
    print("  → Navigating to Instagram login...")
    await page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded")
    await delay(4000, 6000)

    # Handle cookie consent — Instagram shows different dialogs in different regions.
    # Try every known button text that means "accept" or "allow".
    cookie_texts = [
        "Allow all cookies",
        "Allow essential and optional cookies",
        "Accept All",
        "Accept",
        "Only allow essential cookies",  # click this too — any dismissal is fine
        "Decline optional cookies",
    ]
    for text in cookie_texts:
        try:
            btn = page.get_by_role("button", name=re.compile(text, re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click()
                print(f"  → Dismissed cookie dialog: '{text}'")
                await delay(2000, 3000)
                break
        except Exception:
            pass

    # If Instagram redirected to the homepage, navigate back to login
    if "accounts/login" not in page.url:
        print("  → Redirected — going back to login page...")
        await page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded")
        await delay(3000, 5000)

    # Type username character by character
    # Instagram has changed their login form — try multiple selectors in order
    print("  → Waiting for login form...")
    username_field = None
    username_selectors = [
        'input[name="username"]',
        'input[name="email"]',
        'input[aria-label*="Mobile" i]',
        'input[aria-label*="username" i]',
        'input[aria-label*="email" i]',
        'input[placeholder*="Mobile" i]',
        'input[placeholder*="username" i]',
        'input[autocomplete="username"]',
        'input[type="text"]',   # last resort: first text input on the page
    ]
    for sel in username_selectors:
        try:
            el = await page.wait_for_selector(sel, timeout=5000)
            if el:
                username_field = el
                print(f"  → Found username field via selector: {sel}")
                break
        except Exception:
            continue

    if not username_field:
        screenshot_path = str(__file__).replace("instagram.py", "login_debug.png")
        await page.screenshot(path=screenshot_path)
        print(f"  ✗ Login form not found with any selector. Screenshot saved: {screenshot_path}")
        raise Exception("Could not locate username input field on Instagram login page")

    await username_field.click()
    await delay(400, 800)
    for char in INSTAGRAM_USERNAME:
        await username_field.type(char, delay=random.randint(60, 160))

    await delay(500, 1000)

    # Type password character by character
    password_field = await page.query_selector('input[name="password"]')
    if not password_field:
        password_field = await page.query_selector('input[type="password"]')
    await password_field.click()
    await delay(300, 700)
    for char in INSTAGRAM_PASSWORD:
        await password_field.type(char, delay=random.randint(60, 160))

    await delay(600, 1200)

    # Submit the login form — pressing Enter on the password field is more
    # reliable than clicking the button (avoids "Log in with Facebook" confusion)
    await password_field.press("Enter")

    print("  → Waiting for login to complete...")
    await delay(5000, 8000)

    # Dismiss "Save your login info?" popup if shown
    try:
        not_now = page.get_by_role("button", name=re.compile("not now", re.IGNORECASE))
        if await not_now.count() > 0:
            await not_now.first.click()
            await delay(1000, 2000)
    except Exception:
        pass

    # Dismiss "Turn on notifications?" popup if shown
    try:
        not_now = page.get_by_role("button", name=re.compile("not now", re.IGNORECASE))
        if await not_now.count() > 0:
            await not_now.first.click()
            await delay(1000, 2000)
    except Exception:
        pass

    # Check if we're logged in
    logged_in = "instagram.com" in page.url and "login" not in page.url
    print(f"  → Login {'successful' if logged_in else 'FAILED — check credentials'}")
    return logged_in


# ─── Helper: get the year-month of an open post page ──────────────────────
async def get_post_month(page) -> str | None:
    """
    Reads the <time datetime="2026-03-10T12:00:00.000Z"> element on an open post.
    Returns "2026-03" style string, or None if not found.
    This is far more reliable than parsing "4 days ago" or "March 10" text.
    """
    try:
        time_el = await page.query_selector("time[datetime]")
        if time_el:
            dt_attr = await time_el.get_attribute("datetime")
            if dt_attr:
                return dt_attr[:7]  # "2026-03-10T..." → "2026-03"
    except Exception:
        pass
    return None


# ─── Helper: detect whether open post is a Reel, Carousel, or Static ───────
async def detect_post_type(page) -> str:
    """
    Called when a post page is fully open (dedicated URL, not profile grid).

    Detection order:
    1. /reel/ in URL           → Reel
    2. <video> element present → Reel (some video posts use /p/ URL)
    3. Carousel next button    → Carousel (button inside the image to see next slide)
    4. Fallback                → Static
    """
    # 1. URL tells us directly
    if "/reel/" in page.url:
        return "reel"

    # 2. Video element = reel / video post
    try:
        if await page.query_selector("video"):
            return "reel"
    except Exception:
        pass

    # 3. Hover over the post image to reveal carousel navigation arrows.
    #    If a "Next" button appears inside the image container, it's a carousel.
    try:
        img_area = await page.query_selector("article img")
        if img_area:
            await img_area.hover()
            await asyncio.sleep(0.5)

        # Try the most common aria-labels Instagram uses for carousel navigation
        for label in ["Next", "Go to next photo", "Go to next slide"]:
            btn = await page.query_selector(f'button[aria-label="{label}"]')
            if btn:
                return "carousel"
    except Exception:
        pass

    # 4. Default
    return "static"


# ─── Step 2: Scrape a single Instagram profile ────────────────────────────
async def scrape_profile(page, handle: str, target_month: str = None) -> dict:
    """
    How this works:
    1. Visit the profile page and grab follower count.
    2. Collect every post URL visible in the grid.
    3. Navigate to each post individually and read:
       - The exact date from <time datetime="..."> (ISO timestamp — most reliable)
       - The post type (Reel / Carousel / Static) from URL and page elements
    4. Only count posts from target_month (defaults to current month).
    5. Stop as soon as we hit a post older than target_month (grid is newest-first).

    target_month: "2026-02" style string. Pass explicitly for historical scrapes.
    """
    if not target_month:
        target_month = datetime.utcnow().strftime("%Y-%m")   # e.g. "2026-03"
    print(f"  → Scraping @{handle}  (counting posts for {target_month})")

    profile_url = f"https://www.instagram.com/{handle}/"
    await page.goto(profile_url, wait_until="domcontentloaded")
    await delay(3000, 5000)

    result = {
        "follower_count": 0,
        "post_count_reel": 0,
        "post_count_carousel": 0,
        "post_count_static": 0,
        "post_count_story": 0,
        "source_url": profile_url,
    }

    # ── 1. Follower count ───────────────────────────────────────────────────
    try:
        follower_link = await page.query_selector('a[href*="followers"] span[title]')
        if follower_link:
            title = await follower_link.get_attribute("title")
            result["follower_count"] = parse_count(title)
        else:
            meta = await page.query_selector('meta[name="description"]')
            if meta:
                content = await meta.get_attribute("content")
                match = re.search(r"([\d,\.]+[KkMm]?)\s+Followers", content or "")
                if match:
                    result["follower_count"] = parse_count(match.group(1))
    except Exception as e:
        print(f"    ⚠ Follower count error: {e}")

    # ── 2. Collect post URLs from the profile grid ──────────────────────────
    try:
        await page.wait_for_selector('a[href*="/p/"], a[href*="/reel/"]', timeout=10000)
    except Exception:
        print(f"    ⚠ No posts found for @{handle} — profile may be private or empty")
        return result

    # Scroll down to load more posts (Instagram lazy-loads the grid)
    for _ in range(3):
        await page.evaluate("window.scrollBy(0, 700)")
        await delay(1200, 2000)

    raw_links = await page.query_selector_all('a[href*="/p/"], a[href*="/reel/"]')
    post_hrefs = []
    for link in raw_links:
        href = await link.get_attribute("href")
        if href and href not in post_hrefs:
            post_hrefs.append(href)

    print(f"    → {len(post_hrefs)} posts visible in grid — checking dates...")

    # ── 3. Visit each post, read date and type ──────────────────────────────
    for i, href in enumerate(post_hrefs):
        full_url = f"https://www.instagram.com{href}" if href.startswith("/") else href

        try:
            await page.goto(full_url, wait_until="domcontentloaded")
            await delay(1800, 3000)

            post_month = await get_post_month(page)

            if not post_month:
                print(f"      ⚠ Post {i+1}: could not read date — skipping")
                continue

            if post_month < target_month:
                if i < 3:
                    # Posts 1–3 can be pinned to the top of a profile regardless of date.
                    # Instagram allows up to 3 pinned posts — skip them but keep going.
                    print(f"      ⏭ Post {i+1}: {post_month} — possible pinned post, skipping (not stopping)")
                    continue
                else:
                    # Past the pinned zone — this is genuinely old chronological content.
                    print(f"      → Post {i+1} is from {post_month} — past current month, stopping")
                    break

            if post_month == target_month:
                post_type = await detect_post_type(page)
                result[f"post_count_{post_type}"] += 1
                print(f"      ✓ Post {i+1}: {post_type}  ({post_month})")

            # Small pause between post loads to avoid rate-limiting
            await delay(800, 1500)

        except Exception as e:
            print(f"      ⚠ Post {i+1} error: {e} — skipping")
            continue

    print(f"    ✓ @{handle}: {result['follower_count']:,} followers | "
          f"Reels: {result['post_count_reel']} | "
          f"Carousels: {result['post_count_carousel']} | "
          f"Static: {result['post_count_static']}")

    return result


# ─── Main: run the full Instagram scrape ──────────────────────────────────
async def run_instagram_scrape(schools: list, target_month: str = None) -> list:
    """
    schools      = list of dicts: [{'id': uuid, 'name': str, 'handle': str, 'type': 'kings'|'competitor'}]
    target_month = "2026-02" to scrape a past month's posts. Defaults to current month.
    Returns list of snapshot dicts ready to insert into Supabase.
    """
    print("\n📱 Starting Instagram scrape...")
    results = []

    async with async_playwright() as p:
        # Launch a real Chrome browser (visible so you can watch it work)
        # Change headless=True once you're confident it works
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

        # Remove the "webdriver" property that Instagram uses to detect bots
        await page.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        # Log in
        logged_in = await login(page)
        if not logged_in:
            print("  ✗ Instagram login failed. Stopping scrape.")
            await browser.close()
            return []

        # Scrape each school
        for school in schools:
            handle = school.get("instagram_handle")
            if not handle:
                print(f"  ⚠ No Instagram handle for {school['name']} — skipping")
                continue

            await delay(2000, 4000)  # Pause between profiles
            data = await scrape_profile(page, handle, target_month=target_month)

            if data:
                results.append({
                    "school_type": school["type"],
                    "school_name": school["name"],
                    "school_id": school["id"],
                    "platform": "instagram",
                    "follower_count": data["follower_count"],
                    "post_count_reel": data["post_count_reel"],
                    "post_count_carousel": data["post_count_carousel"],
                    "post_count_static": data["post_count_static"],
                    "post_count_story": data["post_count_story"],
                    "source_url": data["source_url"],
                })

        await browser.close()

    print(f"✓ Instagram scrape complete — {len(results)} profiles scraped\n")
    return results
