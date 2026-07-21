import asyncio
import httpx
import json
import os
import logging
import sys
import random
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler(sys.stdout)])
logger = logging.getLogger("auto_scraper")

JSON_PATH = os.path.join("wallpaper-web", "public", "wallpapers.json")

BASE_4K = "https://4kwallpapers.com"
HEADERS_4K = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://4kwallpapers.com/",
}

# 4kwallpapers categories + approximate max pages for random range
CATEGORIES_4K = [
    ("/cars/",     "vehicle",   183),
    ("/anime/",    "anime",     120),
    ("/games/",    "games",     80),
    ("/sci-fi/",   "sci-fi",    40),
    ("/nature/",   "landscape", 200),
]


async def fetch_20_live(client):
    logger.info("Fetching 20 Live Wallpapers from wallpaperwaves.com...")
    
    # 301 redirect fix: pages must end with /
    page_num = random.randint(1, 10)
    url = f"https://wallpaperwaves.com/page/{page_num}/" if page_num > 1 else "https://wallpaperwaves.com/"

    results = []
    try:
        resp = await client.get(url, headers=HEADERS_4K, timeout=20, follow_redirects=True)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        # Find detail page links
        detail_links = soup.select("h3.jeg_post_title a")
        random.shuffle(detail_links)
        
        for link in detail_links[:20]:
            href = link.get("href")
            if not href: continue
            full_url = urljoin(url, href)

            try:
                detail_resp = await client.get(full_url, headers=HEADERS_4K, timeout=20, follow_redirects=True)
                detail_resp.raise_for_status()
                dsoup = BeautifulSoup(detail_resp.text, "lxml")
                
                # Try to find the download link or video tag
                target_tag = dsoup.select_one("a[href*='download.php']")
                video_url = ""
                
                if target_tag and target_tag.get("href"):
                    video_url = urljoin(full_url, target_tag.get("href"))
                else:
                    # Fallback to direct video src
                    vid = dsoup.select_one("video source") or dsoup.select_one("video")
                    if vid and vid.get("src"):
                        video_url = urljoin(full_url, vid.get("src"))

                if not video_url:
                    continue

                title = dsoup.title.text.replace(' - WallpaperWaves', '').replace('Live Wallpaper', '').strip() if dsoup.title else 'Wallpaper'
                
                # Get thumbnail/poster
                poster = ""
                vid_tag = dsoup.select_one('video')
                if vid_tag and vid_tag.get('poster'): 
                    poster = urljoin(full_url, vid_tag.get('poster'))
                else:
                    og = dsoup.select_one('meta[property="og:image"]')
                    if og and og.get('content'): 
                        poster = urljoin(full_url, og.get('content'))

                results.append({
                    "id": full_url,
                    "title": title,
                    "video_url": video_url,
                    "thumbnail_url": poster,
                    "type": "live",
                    "category": "live",
                    "source": "wallpaperwaves"
                })
            except Exception as e:
                logger.debug(f"Error fetching live detail {full_url}: {e}")
                continue

            await asyncio.sleep(0.5)

    except Exception as e:
        logger.error(f"Error fetching live wallpapers: {e}")

    logger.info(f"Fetched {len(results)} live wallpapers.")
    return results


async def fetch_20_static(client):
    """Scrapes 20 fresh static wallpapers from 4kwallpapers.com on a random page."""
    logger.info("Fetching 20 Static Wallpapers from 4kwallpapers.com...")

    path, category, max_pages = random.choice(CATEGORIES_4K)
    page = random.randint(1, max_pages)
    url = f"{BASE_4K}{path}" if page == 1 else f"{BASE_4K}{path}?page={page}"

    logger.info(f"  Scraping category={category}, page={page}: {url}")

    results = []
    try:
        resp = await client.get(url, headers=HEADERS_4K, timeout=20)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        items = soup.select("p.wallpapers__item")

        for item in items[:20]:
            try:
                a_tag = item.select_one("a.wallpapers__canvas_image")
                img_tag = item.select_one("img[itemprop='thumbnail']")
                if not a_tag or not img_tag:
                    continue

                detail_href = a_tag.get("href", "")
                thumb_src = img_tag.get("src", "")
                if not detail_href or not thumb_src:
                    continue

                if detail_href.startswith("/"): detail_href = BASE_4K + detail_href
                if thumb_src.startswith("/"): thumb_src = BASE_4K + thumb_src

                large_thumb = thumb_src.replace("/thumbs/", "/thumbs_2t/")

                # Derive 4K URL from slug pattern
                filename = detail_href.rstrip('/').split('/')[-1].replace('.html', '')
                parts = filename.split('-')
                wall_id = parts[-1]
                if not wall_id.isdigit(): continue
                slug = '-'.join(parts[:-1])
                ext_match = re.search(r'\.(jpg|jpeg|png|webp)$', thumb_src, re.IGNORECASE)
                ext = f".{ext_match.group(1)}" if ext_match else ".jpg"
                image_url_4k = f"{BASE_4K}/images/wallpapers/{slug}-3840x2160-{wall_id}{ext}"

                title = img_tag.get("alt", "Wallpaper").strip()

                results.append({
                    "id": detail_href,
                    "title": title,
                    "image_url": image_url_4k,
                    "thumbnail_url": large_thumb,
                    "resolution": "3840x2160",
                    "type": "static",
                    "category": category,
                    "source": "4kwallpapers",
                })
            except Exception:
                continue

    except Exception as e:
        logger.error(f"Error fetching static from 4kwallpapers: {e}")

    logger.info(f"Fetched {len(results)} static wallpapers from 4kwallpapers.com ({category} p.{page})")
    return results


async def job():
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            live_items = await fetch_20_live(client)
            static_items = await fetch_20_static(client)

        new_items = live_items + static_items
        if not new_items:
            logger.info("No items fetched.")
            return

        existing = []
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                try: 
                    existing = json.load(f)
                except Exception as e:
                    logger.error(f"Failed to read existing JSON, aborting to prevent overwrite: {e}")
                    return

        normalized = []
        for w in existing:
            if isinstance(w, str):
                normalized.append({"id": w, "video_url": w, "type": "live", "title": w.split('/').pop()})
            else:
                normalized.append(w)

        existing_ids = {w["id"] for w in normalized}
        added = 0

        random.shuffle(new_items)
        for w in new_items:
            if w["id"] not in existing_ids:
                normalized.insert(0, w)
                existing_ids.add(w["id"])
                added += 1

        if added > 0:
            tmp_path = JSON_PATH + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(normalized, f, indent=2, ensure_ascii=False)
            os.replace(tmp_path, JSON_PATH)
            logger.info(f"Added {added} NEW wallpapers! (Total: {len(normalized)})")
        else:
            logger.info("No new unique wallpapers found this run.")

    except Exception as e:
        logger.error(f"Job failed: {e}")


async def main():
    if "--oneshot" in sys.argv or os.environ.get("GITHUB_ACTIONS") == "true":
        logger.info("--- Starting One-Shot Scraping Job (CI/CD Mode) ---")
        await job()
        logger.info("--- One-Shot Job Complete ---")
        return

    logger.info("Starting Auto-Scraper Daemon (4kwallpapers.com). Runs every 20 minutes.")
    while True:
        logger.info("--- Starting Scraping Job ---")
        await job()
        logger.info("--- Job Complete. Sleeping for 20 minutes... ---")
        await asyncio.sleep(20 * 60)


if __name__ == "__main__":
    asyncio.run(main())
