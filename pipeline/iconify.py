"""Icon lookup via the free Iconify API (no key). Colour icon sets only, so they suit a white canvas.

.env: IMAGE_SOURCE=iconify
      ICONIFY_PREFIXES=fluent-emoji-flat,noto,twemoji,flat-color-icons,openmoji   (earlier = preferred)
Licences differ per set (some need credit); each pick is logged to output/image_credits.txt with its licence.
"""
import json
import urllib.parse
import urllib.request
from pathlib import Path

from common import env

API = "https://api.iconify.design"
_info: dict[str, str] = {}


def _get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "whiteboard-video-engine"}), timeout=30) as r:
        return r.read()


def _licence(prefix: str) -> str:
    if prefix not in _info:
        i = json.loads(_get(f"{API}/collection?prefix={prefix}&info=true")).get("info", {})
        lic = i.get("license", {})
        _info[prefix] = f"{i.get('name', prefix)} by {i.get('author', {}).get('name', '?')} - {lic.get('title', '?')} {lic.get('url', '')}".strip()
    return _info[prefix]


def fetch(query: str, dest_dir: Path) -> tuple[str, str] | None:
    """Returns (path relative to renderer/public, credit line) or None if nothing matches."""
    prefixes = env("ICONIFY_PREFIXES", "fluent-emoji-flat,noto,twemoji,flat-color-icons,openmoji")
    words = sorted(set(query.lower().split()), key=len, reverse=True)
    found = []
    for q in [query] + [w for w in words if w != query.lower()]:  # full phrase first, then each word, longest first
        found = json.loads(_get(f"{API}/search?" + urllib.parse.urlencode({"query": q, "limit": 12, "prefixes": prefixes}))).get("icons", [])
        if found:
            break
    if not found:
        return None
    rank = {p: i for i, p in enumerate(prefixes.split(","))}
    prefix, name = min((s.split(":", 1) for s in found), key=lambda pn: rank.get(pn[0], 99))
    dest = dest_dir / f"i_{prefix}_{name}.svg"
    if not dest.exists():  # height param: SVGs otherwise default to 1em, which renders tiny in <img>
        dest.write_bytes(_get(f"{API}/{prefix}/{name}.svg?height=400"))
    return f"assets/{dest.name}", f"{query} | {prefix}:{name} | {_licence(prefix)}"
