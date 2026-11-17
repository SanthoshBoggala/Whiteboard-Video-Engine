"""Second Gemini pass: review draft_storyboard.json, fix visuals/props, keep narration identical.
The original is kept as draft_storyboard.v1.json. Any failure keeps the original draft (the video never breaks because of this step)."""
import argparse
import importlib.util
import json
from pathlib import Path

from common import INPUT, OUTPUT, env, load_env
from models import Storyboard, schema_text

PROMPT = Path(__file__).parent / "prompts" / "review_scenes.md"
_spec = importlib.util.spec_from_file_location("plan", Path(__file__).parent / "0_plan_scenes.py")
plan = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(plan)  # reuse call_gemini / parse (module name starts with a digit)

norm = lambda s: " ".join(s.split())


def reject_reason(old: Storyboard, new: Storyboard) -> str | None:
    """None if `new` only changed visuals; else why it must be thrown away."""
    if [s.id for s in old.scenes] != [s.id for s in new.scenes]:
        return "scene ids/count/order changed"
    bad = [a.id for a, b in zip(old.scenes, new.scenes) if norm(a.narration) != norm(b.narration)]
    return f"narration changed in {bad}" if bad else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", default=str(INPUT / "story.txt"))
    a = ap.parse_args()
    load_env()
    draft = OUTPUT / "draft_storyboard.json"
    old = Storyboard.model_validate_json(draft.read_text())
    if env("WBVE_FAKE_GEMINI"):
        print("review skipped (fake gemini)")
        return
    prompt = (PROMPT.read_text().replace("{{THEME}}", old.meta.theme).replace("{{SCHEMA}}", schema_text(old.meta.theme))
              .replace("{{STORY}}", Path(a.story).read_text().strip()).replace("{{DRAFT}}", old.model_dump_json(by_alias=True)))
    err, new = "", None
    for attempt in (1, 2):
        try:
            print(f"reviewing draft with gemini (attempt {attempt}/2)...", flush=True)
            new = plan.parse(plan.call_gemini(prompt + (f"\n\nYour previous output was rejected: {err}\nFix it and output only the JSON." if err else "")), old.meta.theme)
            err = reject_reason(old, new) or ""
        except (SystemExit, Exception) as e:  # call_gemini die()s on repeated server errors; JSON/schema errors land here too
            err, new = str(e)[:300] or type(e).__name__, None
        if new and not err:
            break
        print(f"review attempt {attempt} rejected: {err}", flush=True)
        new = None
    if not new:
        print("review failed - keeping the original draft")
        return
    new.meta = old.meta  # keep fps/size/theme exactly as planned
    (OUTPUT / "draft_storyboard.v1.json").write_text(old.model_dump_json(indent=1, by_alias=True))
    draft.write_text(new.model_dump_json(indent=1, by_alias=True))
    changed = [(o.id, o.type, n.type) for o, n in zip(old.scenes, new.scenes) if (o.props, o.assets, o.type) != (n.props, n.assets, n.type)]
    print(f"review done: {len(changed)}/{len(old.scenes)} scenes improved -> output/draft_storyboard.json (original: draft_storyboard.v1.json)")
    print("changed:", ", ".join(i for i, _, _ in changed) or "none")


if __name__ == "__main__":
    main()
