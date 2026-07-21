"""
fetch_4kwallpapers.py — Scrapes 4kwallpapers.com for high-quality static wallpapers.

Scrapes 6 categories across many pages, builds full 4K download URLs without
needing to visit each detail page, and merges into wallpapers.json.

Usage: python fetch_4kwallpapers.py
"""

import asyncio
import httpx
import json
import os
import logging
import sys
import re
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

JSON_PATH = os.path.join("wallpaper-web", "public", "wallpapers.json")
BASE_URL = "https://4kwallpapers.com"

# Categories to scrape: (url_path, our_category_name, pages_to_scrape)
# The site has 100+ pages per category — scraping 15 = ~300 wallpapers per category
CATEGORIES = [
    ("/",          "all",       10),  # Homepage — mixed content for "All" section
    ("/cars/",     "vehicle",   15),
    ("/anime/",    "anime",     15),
    ("/games/",    "games",     15),
    ("/sci-fi/",   "sci-fi",    15),
    ("/nature/",   "landscape", 15),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://4kwallpapers.com/",
}


def build_4k_url(detail_href: str, thumb_ext: str) -> str:
    """
    Constructs the 4K download URL from the detail page URL.
    
    Example:
      detail_href: https://4kwallpapers.com/cars/genesis-magma-gt3-26722.html
      -> slug: genesis-magma-gt3
      -> id: 26722
      -> 4K URL: https://4kwallpapers.com/images/wallpapers/genesis-magma-gt3-3840x2160-26722.jpeg
    """
    try:
        filename = detail_href.rstrip('/').split('/')[-1].replace('.html', '')
        parts = filename.split('-')
        # The last part is always the numeric ID
        wall_id = parts[-1]
        if not wall_id.isdigit():
            return ""
        slug = '-'.join(parts[:-1])
        ext = thumb_ext if thumb_ext in ('.jpg', '.jpeg', '.png', '.webp') else '.jpg'
        return f"{BASE_URL}/images/wallpapers/{slug}-3840x2160-{wall_id}{ext}"
    except Exception:
        return ""


def extract_wallpaper_id(thumb_src: str) -> str:
    """Extract the numeric ID from a thumbnail URL."""
    match = re.search(r'/(\d+)\.(jpg|jpeg|png|webp)$', thumb_src, re.IGNORECASE)
    if match:
        return match.group(1)
    return ""


async def scrape_page(client: httpx.AsyncClient, url: str, category: str) -> list:
    """Scrape a single gallery page and return a list of wallpaper dicts."""
    results = []
    try:
        resp = await client.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"  Failed to fetch {url}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    items = soup.select("p.wallpapers__item")

    for item in items:
        try:
            a_tag = item.select_one("a.wallpapers__canvas_image")
            img_tag = item.select_one("img[itemprop='thumbnail']")
            
            if not a_tag or not img_tag:
                continue

            detail_href = a_tag.get("href", "")
            thumb_src = img_tag.get("src", "")
            
            if not detail_href or not thumb_src:
                continue

            # Normalize URLs
            if detail_href.startswith("/"):
                detail_href = BASE_URL + detail_href
            if thumb_src.startswith("/"):
                thumb_src = BASE_URL + thumb_src

            # Get extension from thumbnail
            ext_match = re.search(r'\.(jpg|jpeg|png|webp)$', thumb_src, re.IGNORECASE)
            thumb_ext = f".{ext_match.group(1)}" if ext_match else ".jpg"
            
            # Build large thumbnail (thumbs_2t = 800px wide)
            large_thumb = thumb_src.replace("/thumbs/", "/thumbs_2t/")
            
            # Build 4K URL
            image_url_4k = build_4k_url(detail_href, thumb_ext)

            # Get title from img alt
            title = img_tag.get("alt", "Wallpaper").strip()
            
            # Get wall ID for our unique key
            wall_id = extract_wallpaper_id(thumb_src)
            
            if not wall_id or not image_url_4k:
                continue

            results.append({
                "id": detail_href,              # Detail page URL as unique ID
                "title": title,
                "image_url": image_url_4k,      # Full 4K download URL
                "thumbnail_url": large_thumb,   # 800px thumbnail for display
                "resolution": "3840x2160",
                "type": "static",
                "category": category,
                "source": "4kwallpapers",
            })
        except Exception as e:
            logger.debug(f"  Error parsing item: {e}")
            continue

    return results


async def scrape_category(client: httpx.AsyncClient, path: str, category: str, max_pages: int) -> list:
    """Scrape multiple pages of a category."""
    all_results = []
    base_cat_url = BASE_URL + path
    
    for page_num in range(1, max_pages + 1):
        if page_num == 1:
            url = base_cat_url
        else:
            url = f"{base_cat_url}?page={page_num}"
        
        logger.info(f"  Scraping [{category}] page {page_num}/{max_pages}: {url}")
        items = await scrape_page(client, url, category)
        
        if not items:
            logger.info(f"  No items found on page {page_num}, stopping category.")
            break
        
        all_results.extend(items)
        logger.info(f"  Got {len(items)} items (total so far: {len(all_results)})")
        
        # Be polite — 0.5s delay between page requests
        await asyncio.sleep(0.5)

    return all_results


async def main():
    logger.info("=" * 60)
    logger.info("4kwallpapers.com Scraper starting...")
    logger.info("=" * 60)

    # Load existing JSON
    existing = []
    if os.path.exists(JSON_PATH):
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f)
            logger.info(f"Loaded {len(existing)} existing wallpapers from JSON")
        except Exception as e:
            logger.error(f"Could not load existing JSON, aborting to prevent overwrite: {e}")
            return

    # Normalize existing data
    normalized_existing = []
    for w in existing:
        if isinstance(w, str):
            normalized_existing.append({"id": w, "video_url": w, "type": "live"})
        else:
            normalized_existing.append(w)

    # Build set of existing IDs to avoid duplicates
    existing_ids = {w["id"] for w in normalized_existing}
    logger.info(f"Existing unique IDs: {len(existing_ids)}")

    # Scrape all categories
    all_new = []
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    
    async with httpx.AsyncClient(limits=limits, timeout=30) as client:
        for path, category, max_pages in CATEGORIES:
            logger.info(f"\nStarting category: {category} ({path}), up to {max_pages} pages")
            cat_results = await scrape_category(client, path, category, max_pages)
            
            # Filter out duplicates
            new_items = [w for w in cat_results if w["id"] not in existing_ids]
            for w in new_items:
                existing_ids.add(w["id"])
            
            all_new.extend(new_items)
            logger.info(f"Category '{category}' done: {len(new_items)} new unique items")
            
            # Polite delay between categories
            await asyncio.sleep(1.0)

    logger.info(f"\nTotal new wallpapers scraped: {len(all_new)}")

    if all_new:
        # Prepend new items to the combined list
        combined = all_new + normalized_existing
        
        os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
        tmp_path = JSON_PATH + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(combined, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, JSON_PATH)
        
        logger.info(f"Saved {len(combined)} total wallpapers to {JSON_PATH}")
        logger.info(f"  ({len(all_new)} new from 4kwallpapers + {len(normalized_existing)} existing)")
    else:
        logger.info("No new wallpapers found. JSON unchanged.")

    logger.info("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
