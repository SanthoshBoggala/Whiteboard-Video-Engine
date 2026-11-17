"""Last stage: story + finished storyboard -> output/<name>/thumbnail.png + youtube_package.txt
(title, alternative titles, description with chapters, hashtags, tags, pinned comment).
Gemini writes the text, headless Chrome draws the thumbnail. No Claude involved."""
import argparse
import html
import importlib.util
import json
import re
import subprocess
from pathlib import Path

from common import INPUT, OUTPUT, ROOT, env, load_env
from models import Storyboard

PROMPT = Path(__file__).parent / "prompts" / "publish_kit.md"
FONT = ROOT / "renderer" / "public" / "fonts" / "inter-latin-700-normal.woff2"
DEFAULT_FOOTER = "Voice: AI-generated narration. Visuals: animated illustrations made with code."
_spec = importlib.util.spec_from_file_location("plan", Path(__file__).parent / "0_plan_scenes.py")
plan = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(plan)  # reuse call_gemini (module name starts with a digit)


def stamp(s: float) -> str:
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{int(s % 60):02d}" if s >= 3600 else f"{int(s // 60):02d}:{int(s % 60):02d}"


def chapter_candidates(sb: Storyboard) -> list[tuple[float, str, str]]:
    """Scene starts at least 30 s apart (first at 0). Needs 3+ and a video over 90 s; none for Shorts."""
    fps = sb.meta.fps
    if sb.meta.theme.endswith("shorts") or sb.meta.total_frames / fps < 90:
        return []
    rows, last = [], None
    for sc in sb.scenes:
        t = sc.start_frame / fps
        if last is None or t - last >= 30:
            guess = str(sc.props.get("caption") or sc.props.get("title") or sc.props.get("heading") or " ".join(sc.narration.split()[:6])).strip(" .,:;")
            rows.append((t, sc.narration, guess))
            last = t
    return rows if len(rows) >= 3 else []


def clean_tags(tags: list, limit: int = 15) -> list[str]:
    out = []
    for t in tags:
        t = "#" + re.sub(r"[^\w]", "", str(t).lstrip("#"))
        if len(t) > 1 and t.lower() not in [x.lower() for x in out]:
            out.append(t)
    return out[:limit]


def fake_kit(story: str, rows) -> dict:  # offline smoke test (WBVE_FAKE_GEMINI)
    first = re.split(r"(?<=[.!?])\s", story.strip())[0]
    return {"title": first[:70], "alt_titles": [first[:60] + " (explained)", "Explained simply", "What you should know"],
            "description": first + "\n\nIn this video:\n• The main idea\n• Why it matters\n\nWhat would you like explained next?",
            "chapters": [f"Part {i + 1}" for i in range(len(rows))], "hashtags": ["#explained", "#learn", "#story"],
            "tags": ["explained", "learn", "story"], "pinned_comment": "What should we explain next?",
            "thumbnail": {"top": "EXPLAINED", "big": "WHY?", "bottom": first[:28], "badge": "", "mood": "happy"}}


def ask_gemini(story: str, sb: Storyboard, rows) -> dict:
    mins = sb.meta.total_frames / sb.meta.fps / 60
    short = sb.meta.theme.endswith("shorts")
    prompt = (PROMPT.read_text().replace("{{STORY}}", story).replace("{{THEME}}", sb.meta.theme).replace("{{MINUTES}}", f"{mins:.1f}")
              .replace("{{FORMAT}}", "YouTube Short (vertical, under 60 seconds)" if short else "long YouTube video")
              .replace("{{CHAPTERS}}", "\n".join(f"{i + 1}. {n[:160]}" for i, (_, n, _g) in enumerate(rows)) or "(none)"))
    err = ""
    for attempt in (1, 2):
        try:
            raw = plan.call_gemini(prompt + (f"\n\nYour previous output was invalid: {err}\nOutput only the JSON." if err else ""))
            d = json.loads(re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip())
            if not (isinstance(d.get("title"), str) and isinstance(d.get("description"), str) and isinstance(d.get("thumbnail"), dict)):
                raise ValueError("missing title/description/thumbnail")
            return d
        except (SystemExit, Exception) as e:
            err = str(e)[:200] or type(e).__name__
            print(f"kit attempt {attempt}/2 failed: {err}", flush=True)
    raise SystemExit("Gemini could not write the kit")


# ---- thumbnail ---------------------------------------------------------------------------------
LOOKS = {  # theme -> palette; figure = stick figure on the right (landscape) / bottom (vertical)
    "dark": dict(bg="linear-gradient(180deg,#0E1A33,#0A1428)", ink="#FFFFFF", big="#F2C94C", stroke="none", sub="#AEB8CC", badge="#F26B6B", badge_ink="#fff", figure=False),
    "paper": dict(bg="#EDEBDD", ink="#15233F", big="#B8481F", stroke="none", sub="#5B6478", badge="#15233F", badge_ink="#EDEBDD", figure=False),
    "cartoon": dict(bg="#F4EFE2", ink="#1A1A1A", big="#2FA36B", stroke="10px #1A1A1A", sub="#1A1A1A", badge="#D9534F", badge_ink="#fff", figure=True),
}
THEME_LOOK = {"dark": "dark", "shorts": "dark", "paper": "paper", "papershorts": "paper"}  # everything else: cartoon look
MOUTH = {"happy": '<path d="M 200 198 Q 235 238 270 198" stroke-width="9"/>',
         "excited": '<path d="M 198 196 Q 235 250 272 196 Z" fill="#F28B9B" stroke-width="7"/>',
         "shocked": '<ellipse cx="235" cy="214" rx="16" ry="24" fill="#1A1A1A"/>',
         "worried": '<path d="M 205 214 Q 220 196 235 214 Q 250 232 265 214" stroke-width="8"/>'}


def fit(text: str, width: int, max_px: int, em: float) -> int:
    return max(24, min(max_px, int(width / (em * max(len(text), 1)))))


def figure_svg(mood: str, w: int, h: int) -> str:
    return f'''<svg width="{w}" height="{h}" viewBox="0 0 470 640" fill="none" stroke="#1A1A1A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
 <ellipse cx="235" cy="624" rx="100" ry="14" fill="#0000001f" stroke="none"/>
 <line x1="235" y1="400" x2="190" y2="612" stroke-width="11"/><line x1="235" y1="400" x2="280" y2="612" stroke-width="11"/>
 <ellipse cx="178" cy="616" rx="34" ry="12" fill="#fff"/><ellipse cx="292" cy="616" rx="34" ry="12" fill="#fff"/>
 <line x1="235" y1="250" x2="235" y2="400" stroke-width="11"/>
 <polyline points="235,285 130,262 92,178" stroke-width="11"/><ellipse cx="90" cy="168" rx="24" ry="16" fill="#fff"/>
 <polyline points="235,285 340,262 378,178" stroke-width="11"/><ellipse cx="380" cy="168" rx="24" ry="16" fill="#fff"/>
 <circle cx="235" cy="170" r="88" fill="#fff" stroke-width="10"/>
 <circle cx="205" cy="158" r="8" fill="#1A1A1A" stroke="none"/><circle cx="265" cy="158" r="8" fill="#1A1A1A" stroke="none"/>
 {MOUTH.get(mood, MOUTH["happy"])}</svg>'''


def thumb_html(t: dict, theme: str) -> tuple[str, int, int]:
    L = LOOKS[THEME_LOOK.get(theme, "cartoon")]
    vertical = theme.endswith("shorts")
    W, H = (1080, 1920) if vertical else (1280, 720)
    e = lambda k, n: html.escape(str(t.get(k, ""))[:n])
    top, big, bottom, badge = e("top", 24).upper(), e("big", 10).upper(), e("bottom", 30), e("badge", 16).upper()
    fig = L["figure"]
    area = 900 if vertical else (770 if fig else 1160)
    big_px = fit(big, area, 420 if vertical else 300, 0.84)  # wide capitals such as W, M, ?
    top_px, bot_px = fit(top, area, 80, 0.68), fit(bottom, area, 78, 0.58)
    font = f"@font-face{{font-family:Inter;font-weight:800;src:url(file://{FONT})}}"
    if vertical:
        body = f'''<div class="c"><div class="t">{top}</div><div class="b">{big}</div><div class="s">{bottom}</div>{f'<div class="badge">{badge}</div>' if badge else ''}</div>
{f'<div class="fig">{figure_svg(t.get("mood", "happy"), 640, 870)}</div>' if fig else ''}'''
        pos = f".c{{position:absolute;left:90px;right:90px;top:{480 if not fig else 150}px;text-align:center}}.t{{font-size:{top_px}px;font-weight:800}}.b{{font-size:{big_px}px;line-height:1.05;font-weight:800;color:{L['big']};-webkit-text-stroke:{L['stroke']};paint-order:stroke fill;margin:30px 0}}.s{{font-size:{bot_px}px;font-weight:800;color:{L['sub']}}}.badge{{display:inline-block;margin-top:50px;background:{L['badge']};color:{L['badge_ink']};font-size:70px;font-weight:800;padding:12px 38px;border-radius:22px;transform:rotate(-3deg)}}.fig{{position:absolute;left:0;right:0;bottom:0;text-align:center}}"
    else:
        body = f'''<div class="t">{top}</div><div class="b">{big}</div><div class="s">{bottom}</div>{f'<div class="badge">{badge}</div>' if badge else ''}
{f'<div class="fig">{figure_svg(t.get("mood", "happy"), 360, 490)}</div>' if fig else ''}'''
        pos = f".t{{position:absolute;left:60px;top:50px;font-size:{top_px}px;font-weight:800}}.b{{position:absolute;left:52px;top:150px;font-size:{big_px}px;line-height:1;font-weight:800;color:{L['big']};letter-spacing:-6px;-webkit-text-stroke:{L['stroke']};paint-order:stroke fill}}.s{{position:absolute;left:60px;top:{150 + int(big_px * 1.05) + 20}px;font-size:{bot_px}px;font-weight:800;color:{L['sub']}}}.badge{{position:absolute;left:60px;bottom:50px;background:{L['badge']};color:{L['badge_ink']};font-size:58px;font-weight:800;padding:10px 34px;border-radius:20px;transform:rotate(-3deg)}}.fig{{position:absolute;right:-10px;bottom:0}}"
    return (f'<!doctype html><meta charset="utf-8"><style>{font}*{{margin:0;box-sizing:border-box}}body{{width:{W}px;height:{H}px;background:{L["bg"]};color:{L["ink"]};font-family:Inter,sans-serif;position:relative;overflow:hidden}}{pos}</style>{body}', W, H)


def draw_thumbnail(t: dict, theme: str):
    import os
    page, W, H = thumb_html(t, theme)
    (OUTPUT / "thumbnail.html").write_text(page)
    chrome = os.environ.get("CHROME_PATH") or "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if not Path(chrome).exists():
        print("thumbnail skipped: Chrome not found (set CHROME_PATH)")
        return
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", f"--window-size={W},{H}",
                    f"--screenshot={OUTPUT / 'thumbnail.png'}", f"file://{OUTPUT / 'thumbnail.html'}"], check=True, capture_output=True)
    print(f"thumbnail -> {OUTPUT / 'thumbnail.png'} ({W}x{H})")


# ---- package -----------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", default=str(INPUT / "story.txt"))
    ap.add_argument("--theme", default="")
    a = ap.parse_args()
    load_env()
    sb = Storyboard.model_validate_json((OUTPUT / "storyboard.json").read_text())
    story = Path(a.story).read_text().strip()
    rows = chapter_candidates(sb)
    kit_f = OUTPUT / "kit.json"  # a hand-written kit (title, description, hashtags, tags, pinned_comment, thumbnail) skips Gemini
    if kit_f.exists():
        kit = json.loads(kit_f.read_text())
        print("using hand-written kit.json (no Gemini call)")
    else:
        kit = fake_kit(story, rows) if env("WBVE_FAKE_GEMINI") else ask_gemini(story, sb, rows)

    titles = kit.get("chapters") or []
    if rows and len(titles) != len(rows):
        titles = [g for _, _, g in rows]  # Gemini gave none (or a wrong count): use each scene's own caption
    chapters = "\n".join(f"{stamp(t)} {str(n).strip()}" for (t, _, _g), n in zip(rows, titles)) if rows else ""
    footer = (INPUT / "description_footer.txt").read_text().strip() if (INPUT / "description_footer.txt").exists() else DEFAULT_FOOTER
    credit_f, music = INPUT / "bg_music_credit.txt", INPUT / "bg_music.mp3"
    tags = clean_tags(kit.get("hashtags", []))
    desc = kit["description"].strip()
    if chapters:
        desc += "\n\nChapters:\n" + chapters
    desc += "\n\n" + footer
    if music.exists() and credit_f.exists():
        desc += "\nMusic: " + credit_f.read_text().strip()
    if tags:
        desc += "\n\n" + " ".join(tags)

    th = kit["thumbnail"]
    try:
        draw_thumbnail(th, a.theme or sb.meta.theme)
    except Exception as e:  # the text kit is still useful without a thumbnail
        print("thumbnail failed:", str(e)[:200])

    title = kit["title"].strip()[:100]
    secs = sb.meta.total_frames / sb.meta.fps
    lines = [f"YOUTUBE PACKAGE  ({OUTPUT.name}: {stamp(secs)} long, theme {sb.meta.theme})", "=" * 70, "",
             "TITLE", title, f"({len(title)} characters)", "", "ALTERNATIVE TITLES", *[f"- {t}" for t in kit.get("alt_titles", [])], "",
             "DESCRIPTION (copy everything between the lines)", "-" * 70, desc, "-" * 70, "",
             "HASHTAGS", " ".join(tags), "(YouTube ignores all hashtags if a video has more than 15; the first 3 show above the title)", "",
             "TAGS (YouTube Studio > Show more > Tags)", ", ".join(str(t) for t in kit.get("tags", [])), "",
             "PINNED COMMENT", kit.get("pinned_comment", ""), "",
             "THUMBNAIL", f"file: thumbnail.png   text: {th.get('top', '')} | {th.get('big', '')} | {th.get('bottom', '')} | {th.get('badge', '')}",
             "(edit thumbnail.html and re-open it in Chrome if you want to change the wording)", "",
             "BEFORE YOU UPLOAD",
             "- Check every claim in the description against your story; the text was written by an AI.",
             "- Check the video is full resolution (1920x1080, or 1080x1920 for a Short), not a --fast preview."]
    if music.exists() and not credit_f.exists():
        lines.append("- Background music is used: confirm its licence and add the credit line to the description (or save it in input/bg_music_credit.txt).")
    (OUTPUT / "youtube_package.txt").write_text("\n".join(lines) + "\n")
    print(f"youtube package -> {OUTPUT / 'youtube_package.txt'}")


if __name__ == "__main__":
    main()
