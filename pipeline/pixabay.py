"""Illustration lookup via the official Pixabay API (free key; Pixabay Content License: commercial use OK, no credit required).

.env: PIXABAY_API_KEY=...        IMAGE_SOURCE=pixabay,iconify  (earlier = preferred, later = fallback)
Skips low-quality and AI-generated images. The same query gives the same picture (reuse is fine). Files are downloaded (no hotlinking).
"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

from common import env

API = "https://pixabay.com/api/"


def configured() -> bool:
    return bool(env("PIXABAY_API_KEY"))


def _get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "whiteboard-video-engine"}), timeout=30) as r:
        return r.read()


def fetch(query: str, dest_dir: Path) -> tuple[str, str] | None:
    """Returns (path relative to renderer/public, credit line) or None."""
    for kind in ("vector", "illustration"):
        p = {"key": env("PIXABAY_API_KEY"), "q": query[:100], "image_type": kind, "safesearch": "true", "per_page": 30, "order": "popular"}
        hits = json.loads(_get(API + "?" + urllib.parse.urlencode(p))).get("hits", [])
        for h in hits:
            if h.get("isLowQuality") or h.get("isAiGenerated"):
                continue
            url = h["largeImageURL"]
            dest = dest_dir / f"px_{h['id']}{Path(urllib.parse.urlparse(url).path).suffix or '.png'}"
            if not dest.exists():
                dest.write_bytes(_get(url))
            return f"assets/{dest.name}", f"{query} | pixabay:{h['id']} by {h.get('user', '?')} | {h['pageURL']} | Pixabay Content License"
    return None
