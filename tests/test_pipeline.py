import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))

from align import align_scenes, cue_targets, find_cue, toks  # noqa: E402
from frames import build, chapters  # noqa: E402
from models import Scene, Storyboard  # noqa: E402
from pydantic import ValidationError  # noqa: E402


def sb_of(*narr, typ="ChecklistCard"):
    return Storyboard.model_validate({"meta": {"fps": 60}, "scenes": [
        {"id": f"s{i}", "type": typ, "narration": n, "props": {"items": [n[:40]]}} for i, n in enumerate(narr)]})


def words_of(text, start=0.0, step=0.5):
    return [{"w": w, "start": start + i * step, "end": start + (i + 1) * step} for i, w in enumerate(text.split())]


def test_numbers_normalised():
    assert toks("13 lots") == toks("thirteen lots")


def test_align_scenes_with_filler_and_digit_words():
    nar = ["one lot costs one hundred", "thirteen lots cost more", "so size your position"]
    heard = "um one lot costs one hundred dollars 13 lots cost more so size your position"
    bounds, cov = align_scenes(nar, words_of(heard), audio_len=6.0)
    assert bounds[0][0] == 0.0 and bounds[-1][1] == 6.0
    assert all(b[1] == n[0] for b, n in zip(bounds, bounds[1:]))  # contiguous
    assert bounds[1][0] == pytest.approx(3.5)  # "13" starts scene 2 (word index 7)
    assert cov > 0.9


def test_align_interpolates_unheard_scene():
    nar = ["alpha beta gamma delta", "zzz yyy xxx www", "omega sigma kappa lambda"]
    heard = "alpha beta gamma delta omega sigma kappa lambda"
    bounds, _ = align_scenes(nar, words_of(heard), audio_len=8.0)
    assert bounds[0][1] < bounds[1][1] <= bounds[2][0] + 1e-9 or bounds[1][1] == bounds[2][0]
    assert bounds[1][0] <= bounds[1][1] <= bounds[2][1]


def test_find_cue_window_and_fuzzy():
    w = words_of("buy the stock now")
    assert find_cue("stocks", w, 0, 10) == pytest.approx(1.0)
    assert find_cue("stock", w, 2.0, 10) is None


def test_frames_contiguous_no_drift():
    sb = sb_of(*[f"scene number {i} text here" for i in range(200)])
    bounds = [(i * 1.0173, (i + 1) * 1.0173) for i in range(200)]
    sb = build(sb, bounds, [])
    for a, b in zip(sb.scenes, sb.scenes[1:]):
        assert b.start_frame == a.start_frame + a.duration_frames
    assert sb.scenes[0].start_frame == 0
    assert sb.scenes[-1].start_frame + sb.scenes[-1].duration_frames == round(200 * 1.0173 * 60)  # no accumulated rounding
    assert sb.meta.total_frames == sb.scenes[-1].start_frame + sb.scenes[-1].duration_frames + round(sb.meta.disclaimer_seconds * 60)


def test_min_one_second_per_scene():
    sb = build(sb_of("a b", "c d"), [(0, 0.2), (0.2, 3)], [])
    assert sb.scenes[0].duration_frames == 60


def test_cues_extracted():
    sb = sb_of("first item about taxes here", "second one")
    sb.scenes[0].props = {"items": ["pay your taxes"]}
    out = build(sb, [(0, 3), (3, 5)], words_of("first item about taxes here"))
    assert out.scenes[0].cues and out.scenes[0].cues[0].ref == "item.0"
    assert out.scenes[0].cues[0].offset_frames == 90  # "taxes" is word 3 at 0.5s/word = 1.5s


def test_chapters():
    sb = sb_of(*["word " * 5] * 4)
    sb = build(sb, [(i * 35, (i + 1) * 35) for i in range(4)], [])
    lines = chapters(sb).splitlines()
    assert lines[0].startswith("00:00") and lines[1].startswith("00:35") and len(lines) == 4
    assert chapters(build(sb_of("a b c", "d e f"), [(0, 5), (5, 10)], [])) == ""  # <3 chapters


def test_schema_rejects_bad_props():
    with pytest.raises(ValidationError):
        Scene(id="s1", type="TitleCard", narration="x", props={"title": "t", "bogus": 1})
    with pytest.raises(ValidationError):
        Scene(id="s1", type="TitleCard", narration="x", props={"title": "t" * 200})
    with pytest.raises(ValidationError):
        Scene(id="s1", type="BarChartAnimated", narration="x", props={"bars": [{"label": "a", "value": 0}, {"label": "b", "value": 1}]})


def test_flowchart_from_alias_roundtrip():
    s = Scene(id="s1", type="FlowchartNodes", narration="x", props={
        "nodes": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}], "edges": [{"from": "a", "to": "b"}]})
    assert s.props["edges"][0] == {"from": "a", "to": "b"}


def test_review_rejects_changed_narration():
    import importlib.util
    spec = importlib.util.spec_from_file_location("rev", Path(__file__).resolve().parent.parent / "pipeline" / "0b_review_storyboard.py")
    rev = importlib.util.module_from_spec(spec); spec.loader.exec_module(rev)
    a, same, edited = sb_of("one two", "three"), sb_of("one  two", "three"), sb_of("one two", "THREE!")
    assert rev.reject_reason(a, same) is None  # whitespace only: fine
    assert "narration" in rev.reject_reason(a, edited)
    assert "ids" in rev.reject_reason(a, sb_of("one two"))


def test_publish_kit_helpers():
    import importlib.util
    spec = importlib.util.spec_from_file_location("kit", Path(__file__).resolve().parent.parent / "pipeline" / "6_publish_kit.py")
    kit = importlib.util.module_from_spec(spec); spec.loader.exec_module(kit)
    assert kit.clean_tags(["#Tax Tips", "tax tips", "ABC", "#"]) == ["#TaxTips", "#ABC"]  # dedupe, strip spaces, drop empty
    assert kit.stamp(65) == "01:05" and kit.stamp(3700) == "1:01:40"
    assert kit.chapter_candidates(sb_of("a b", "c d")) == []  # short video: no chapters
