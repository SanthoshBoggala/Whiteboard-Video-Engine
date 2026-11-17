"""Illustrated theme: fill asset.path. Order: local icon folder -> each source in IMAGE_SOURCE (comma list), first hit wins.

Icons: drop SVG/PNG files into renderer/public/icons/ named by keyword (store.svg, sebi.png ...). Fuzzy on the filename.
IMAGE_SOURCE in .env: pixabay | iconify | google | gemini | none, e.g. IMAGE_SOURCE=pixabay,iconify
--no-gen disables all network image fetching (icons + placeholders only).
"""
import argparse
import hashlib
import json
import re
import sys

from rapidfuzz import fuzz, process

import gimages
import iconify
import pixabay
from common import OUTPUT, PUBLIC, env, load_env
from models import Storyboard

STYLE = "flat vector illustration, thick clean outlines, solid colours, plain white background, no text"


def find_icon(query: str, icons: dict[str, str]) -> str | None:
    if not icons:
        return None
    hit = process.extractOne(query.lower(), list(icons), scorer=fuzz.token_set_ratio)
    return icons[hit[0]] if hit and hit[1] >= 85 else None


def generate(prompt: str, dest) -> bool:
    if not env("GEMINI_API_KEY"):
        return False
    from google import genai

    client = genai.Client(api_key=env("GEMINI_API_KEY"))  # keep a reference (see 0_plan_scenes.py)
    r = client.models.generate_content(
        model=env("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"), contents=[f"{prompt}. {STYLE}"])
    for part in r.candidates[0].content.parts:
        if part.inline_data:
            dest.write_bytes(part.inline_data.data)
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-gen", action="store_true")
    a = ap.parse_args()
    load_env()
    sources = [] if a.no_gen else [s.strip() for s in env("IMAGE_SOURCE", "iconify").lower().split(",") if s.strip() and s.strip() != "none"]
    if "google" in sources and not gimages.configured():
        print("warning: IMAGE_SOURCE has google but GOOGLE_SEARCH_API_KEY / GOOGLE_CSE_ID are not set; skipping it", file=sys.stderr)
        sources.remove("google")
    if "pixabay" in sources and not pixabay.configured():
        print("warning: IMAGE_SOURCE has pixabay but PIXABAY_API_KEY is not set in .env; skipping it", file=sys.stderr)
        sources.remove("pixabay")

    sb = Storyboard.model_validate_json((OUTPUT / "draft_storyboard.json").read_text())
    icon_dir, gen_dir = PUBLIC / "icons", PUBLIC / "assets"
    gen_dir.mkdir(exist_ok=True)
    icons = {re.sub(r"[-_]+", " ", p.stem).lower(): f"icons/{p.name}"
             for p in icon_dir.glob("*") if p.suffix in {".svg", ".png"}} if icon_dir.exists() else {}
    cache_f = gen_dir / "google_cache.json"  # "source:query" -> [path, credit]
    cache = json.loads(cache_f.read_text()) if cache_f.exists() else {}
    dead: set[str] = set()

    def lookup(src: str, asset):
        if src == "gemini":
            h = hashlib.sha1(f"{asset.query}|{asset.prompt}|{STYLE}".encode()).hexdigest()[:12]
            dest = gen_dir / f"{h}.png"
            return (f"assets/{dest.name}", None) if dest.exists() or generate(asset.prompt or asset.query, dest) else None
        ck = f"{src}:{asset.query}"
        hit = cache.get(ck)
        if hit and (PUBLIC / hit[0]).exists():  # same query -> same picture (reuse is fine)
            return hit
        hit = pixabay.fetch(asset.query, gen_dir) if src == "pixabay" else (gimages if src == "google" else iconify).fetch(asset.query, gen_dir)
        if hit:
            cache[ck] = list(hit)
        return hit

    missing, by_src = 0, {}
    for sc in sb.scenes:
        for asset in sc.assets:
            asset.path = find_icon(asset.query, icons)
            if asset.path:
                by_src["local"] = by_src.get("local", 0) + 1
                continue
            for src in sources:
                if src in dead:
                    continue
                try:
                    hit = lookup(src, asset)
                except Exception as e:  # quota / key / network: drop this source for the run, try the next
                    print(f"warning: image source '{src}' off for this run ({type(e).__name__}: {str(e)[:160]})", file=sys.stderr)
                    dead.add(src)
                    continue
                if hit:
                    asset.path = hit[0]
                    if hit[1]:
                        gimages.log_credit(hit[1])
                    by_src[src] = by_src.get(src, 0) + 1
                    break
            missing += asset.path is None
    cache_f.write_text(json.dumps(cache))
    (OUTPUT / "draft_storyboard.json").write_text(sb.model_dump_json(indent=1, by_alias=True))
    print(f"assets resolved {by_src}; {missing} fall back to placeholder boxes")


if __name__ == "__main__":
    main()
