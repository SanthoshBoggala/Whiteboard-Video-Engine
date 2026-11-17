"""Story text -> output/draft_storyboard.json via Gemini (or --manual / WBVE_FAKE_GEMINI=1)."""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

from common import INPUT, OUTPUT, ROOT, die, env, load_env
from models import Storyboard, schema_text
from align import toks
from pydantic import ValidationError

PROMPT = Path(__file__).parent / "prompts" / "plan_scenes.md"


def fake_plan(story: str, theme: str) -> dict:
    """Offline planner for tests/demos: paragraphs/sentence groups -> simple scenes."""
    parts = [p.strip() for p in re.split(r"\n\s*\n", story) if p.strip()]
    if len(parts) < 2:
        sents = re.split(r"(?<=[.!?])\s+", story.strip())
        parts = [" ".join(sents[i:i + 2]) for i in range(0, len(sents), 2)]
    scenes = []
    for i, p in enumerate(parts, 1):
        if i == 1:
            t, props = "TitleCard", {"title": re.split(r"(?<=[.!?])\s", p)[0][:90]}
        elif theme == "illustrated":
            word = max(re.findall(r"[a-zA-Z]+", p), key=len)
            t, props = "IllustrationScene", {"body": p[:260]}
        else:
            t, props = "ChecklistCard", {"items": [s[:70] for s in re.split(r"(?<=[.!?])\s+", p)][:6]}
        sc = {"id": f"s{i:02d}", "type": t, "narration": p, "props": props}
        if t == "IllustrationScene":
            sc["assets"] = [{"id": "a1", "query": word.lower(), "cue_word": word}]
        scenes.append(sc)
    return {"meta": {"theme": theme}, "scenes": scenes}


def coverage(story: str, sb: Storyboard) -> float:
    want, have = Counter(toks(story)), Counter(toks(" ".join(s.narration for s in sb.scenes)))
    return sum((want & have).values()) / max(sum(want.values()), 1)


def _gate(model: str, block_for: float = 0.0):
    """Shared state for all parallel runs (free tier: 5 requests/minute PER MODEL).
    block_for == 0: wait until this model may be called again (>= GEMINI_MIN_INTERVAL_S after the last call, or until a cooldown ends), then claim the slot.
    block_for > 0: a 429 told us to back off, so every run leaves this model alone for that long."""
    import fcntl
    import time

    gap = float(env("GEMINI_MIN_INTERVAL_S", "13"))
    path = ROOT / "output" / ".gemini_state.json"
    path.parent.mkdir(exist_ok=True)
    with open(path, "a+") as f:
        fcntl.flock(f, fcntl.LOCK_EX)  # others queue here
        f.seek(0)
        try:
            state = json.loads(f.read() or "{}")
        except ValueError:
            state = {}
        now = time.time()
        wait = 0.0
        if block_for:
            state[model] = max(state.get(model, 0), now + block_for)
        else:
            wait = max(0.0, state.get(model, 0) - now)
            if wait:
                print(f"waiting {wait:.0f}s (shared Gemini limit for {model})", flush=True)
                time.sleep(wait)
            state[model] = time.time() + gap
        f.seek(0)
        f.truncate()
        f.write(json.dumps(state))


def call_gemini(prompt: str) -> str:
    if not env("GEMINI_API_KEY"):
        die("GEMINI_API_KEY missing in .env (or use --manual)")
    from google import genai

    import time

    from google.genai import errors, types

    timeout_s = int(env("GEMINI_TIMEOUT_S", "120"))
    client = genai.Client(api_key=env("GEMINI_API_KEY"), http_options=types.HttpOptions(timeout=timeout_s * 1000))  # keep a reference: a temp client is GC'd and closes its HTTP session
    primary = env("GEMINI_MODEL", "gemini-3.5-flash")
    # when a model is busy (503) or out of quota (429) move on to the next one: each model has its own capacity and its own free-tier limit
    fallbacks = [m.strip() for m in env("GEMINI_FALLBACK_MODELS", "gemini-3.5-flash,gemini-3.6-flash,gemini-3.8-flash").split(",") if m.strip()]
    models = [primary] + [m for m in fallbacks if m != primary]
    print(f"planning with {primary} ({len(prompt)} chars, timeout {timeout_s}s; backups: {', '.join(models[1:]) or 'none'})...", flush=True)
    tries, fails, i = 5 * len(models), 0, 0
    while True:
        model = models[i % len(models)]
        _gate(model)
        t0 = time.time()
        try:
            text = client.models.generate_content(model=model, contents=prompt, config={"response_mime_type": "application/json"}).text
            print(f"gemini ({model}) answered in {time.time() - t0:.0f}s", flush=True)
            return text
        except errors.ClientError as e:
            if e.code == 404:  # this key does not have that model: forget it
                models.remove(model)
                if not models:
                    die("none of the Gemini models are available for your key. Run: .venv/bin/python pipeline/list_models.py flash  and set GEMINI_MODEL in .env")
                print(f"gemini: model {model} not available for this key, skipping it", flush=True)
                continue
            if e.code != 429:
                raise
            m = re.search(r"retry in ([\d.]+)s", str(e))
            delay = float(m.group(1)) + 2 if m else 30
            q = re.search(r"quotaId['\"]?: ['\"]([^'\"]+)", str(e))
            quota = q.group(1) if q else "unknown quota"
            why = f"rate limit 429 ({quota})"
            if "PerDay" in quota:  # the day's free requests for this model are used up: waiting a minute will not help
                models.remove(model)
                print(f"gemini {model}: DAILY free quota used up, not using it again in this run", flush=True)
                if not models:
                    die("the daily free Gemini quota is used up on every model. It resets once a day (Pacific time midnight). Try later, or add billing to your Google AI key.")
                continue
            _gate(model, block_for=delay)  # tell the other parallel runs to leave this model alone for a while
        except Exception as e:  # ServerError 500/503/504 or network timeout
            delay, why = min(60, 10 * (fails // len(models) + 1)), f"{type(e).__name__} {str(e)[:70]}"
        fails += 1
        print(f"gemini {model} failed: {why}", flush=True)
        if fails >= tries:
            die("Gemini kept failing on every model (busy or out of quota). Wait a few minutes and run the same command again; it resumes cleanly.")
        i += 1  # next model
        if fails % len(models) == 0:  # every model has failed once: now wait
            print(f"all models busy, waiting {delay:.0f}s", flush=True)
            time.sleep(delay)


def parse(raw: str, theme: str) -> Storyboard:
    d = json.loads(re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip())
    d.setdefault("meta", {})["theme"] = theme
    return Storyboard.model_validate(d)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", default=str(INPUT / "story.txt"))
    ap.add_argument("--theme", default="whiteboard", choices=["whiteboard", "illustrated", "shorts", "dark", "paper", "papershorts", "cartoon"])
    ap.add_argument("--manual", action="store_true", help="print prompt, read storyboard JSON from stdin")
    a = ap.parse_args()
    load_env()
    story = Path(a.story).read_text().strip()
    if not story:
        die(f"{a.story} is empty")
    tf = Path(a.story).with_suffix(".title.txt")
    if not tf.exists():
        tf = Path(a.story).parent / "title.txt"
    title_hint = f"Use exactly this title for the TitleCard: {tf.read_text().strip()}" if tf.exists() and tf.read_text().strip() else ""
    prompt = PROMPT.read_text().replace("{{THEME}}", a.theme).replace("{{SCHEMA}}", schema_text(a.theme)).replace("{{STORY}}", story).replace("{{TITLE_HINT}}", title_hint)

    if a.manual:
        print(prompt)
        print("\n--- paste the model's JSON, then Ctrl-D ---", file=sys.stderr)
    sb, raw, err = None, "", ""
    for attempt in range(1 if a.manual else 2):
        try:
            if env("WBVE_FAKE_GEMINI"):
                raw = json.dumps(fake_plan(story, a.theme))
            elif a.manual:
                raw = sys.stdin.read()
            else:
                raw = call_gemini(prompt + (f"\n\nYour previous output was invalid: {err}\nFix it and output only the JSON." if err else ""))
            sb = parse(raw, a.theme)
            cov = coverage(story, sb)
            if cov < 0.95:
                sb = None
                raise ValueError(f"narration covers only {cov:.0%} of the story; keep ALL story text")
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            err = str(e)[:1500]
            (OUTPUT / "plan_error.json").write_text(raw)
            print(f"planner attempt {attempt + 1} invalid: {err[:300]}", file=sys.stderr)
        if sb:
            break
    if sb is None:
        die("planner output invalid; raw output saved in output/plan_error.json")
    (OUTPUT / "draft_storyboard.json").write_text(sb.model_dump_json(indent=1, by_alias=True))
    print(f"draft: {len(sb.scenes)} scenes -> output/draft_storyboard.json (edit it before continuing)")


if __name__ == "__main__":
    main()
