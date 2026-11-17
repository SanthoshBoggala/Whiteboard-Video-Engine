"""draft + bounds + words -> output/storyboard.json (frames, cues) + youtube_chapters.txt."""
import json
import shutil

from common import OUTPUT, PUBLIC
from frames import build, chapters
from models import Storyboard


def main():
    sb = Storyboard.model_validate_json((OUTPUT / "draft_storyboard.json").read_text())
    bounds = [tuple(b) for b in json.loads((OUTPUT / "bounds.json").read_text())]
    words = json.loads((OUTPUT / "words.json").read_text())
    sb = build(sb, bounds, words)
    for i in range(1, len(sb.scenes)):  # contiguity invariant
        a, b = sb.scenes[i - 1], sb.scenes[i]
        assert b.start_frame == a.start_frame + a.duration_frames, f"gap before {b.id}"
    text = sb.model_dump_json(indent=1, by_alias=True)
    (OUTPUT / "storyboard.json").write_text(text)
    PUBLIC.mkdir(exist_ok=True)
    (PUBLIC / "storyboard.json").write_text(text)
    ch = chapters(sb)
    (OUTPUT / "youtube_chapters.txt").write_text(ch)
    print(f"{sb.meta.total_frames} frames ({sb.meta.total_frames / sb.meta.fps:.1f}s), "
          f"{sum(len(s.cues) for s in sb.scenes)} cues, chapters: {'yes' if ch else 'no (<3 scenes of 10s+)'}")


if __name__ == "__main__":
    main()
