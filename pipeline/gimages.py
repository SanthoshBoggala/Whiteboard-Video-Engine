"""Image lookup via Google Custom Search JSON API (official API, not scraping).

.env:  GOOGLE_SEARCH_API_KEY=...   GOOGLE_CSE_ID=...   (a Programmable Search Engine with "Image search" on)
       GOOGLE_IMG_RIGHTS=cc_publicdomain|cc_attribute|cc_sharealike   (default; reusable licences only)
       Set GOOGLE_IMG_RIGHTS=none to drop the licence filter - then YOU are responsible for rights.
"""
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path

from common import OUTPUT, env

ENDPOINT = "https://www.googleapis.com/customsearch/v1"
EXT = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/svg+xml": ".svg"}
MAX_BYTES = 6_000_000


def configured() -> bool:
    return bool(env("GOOGLE_SEARCH_API_KEY") and env("GOOGLE_CSE_ID"))


def search(query: str, n: int = 6) -> list[dict]:
    p = {"key": env("GOOGLE_SEARCH_API_KEY"), "cx": env("GOOGLE_CSE_ID"), "q": f"{query} illustration clipart",
         "searchType": "image", "imgType": "clipart", "safe": "active", "num": n}
    rights = env("GOOGLE_IMG_RIGHTS", "cc_publicdomain|cc_attribute|cc_sharealike")
    if rights != "none":
        p["rights"] = rights
    with urllib.request.urlopen(f"{ENDPOINT}?{urllib.parse.urlencode(p)}", timeout=30) as r:
        return json.load(r).get("items", [])


def fetch(query: str, dest_dir: Path) -> tuple[str, str] | None:
    """Download the first usable result. Returns (path relative to renderer/public, credit line) or None."""
    for it in search(query):
        try:
            req = urllib.request.Request(it["link"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                ext = EXT.get(r.headers.get_content_type())
                data = r.read(MAX_BYTES + 1)
            if not ext or len(data) > MAX_BYTES:
                continue
        except Exception:
            continue  # dead link / hotlink block: try the next result
        dest = dest_dir / f"g{hashlib.sha1(it['link'].encode()).hexdigest()[:12]}{ext}"
        dest.write_bytes(data)
        credit = f"{query} | {it.get('title', '')} | {it.get('image', {}).get('contextLink', it['link'])} | rights filter: {env('GOOGLE_IMG_RIGHTS', 'default')}"
        return f"assets/{dest.name}", credit
    return None


def log_credit(line: str):
    with open(OUTPUT / "image_credits.txt", "a") as f:
        f.write(line + "\n")
