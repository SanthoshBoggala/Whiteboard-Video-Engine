"""Seconds -> frames, cues, chapters."""
from align import cue_targets, find_cue
from models import Cue, Storyboard


def captions(sc, ws: list[dict], fps: int) -> list[tuple[str, int]]:
    """Narration's own words (right spelling, rupee signs) timed by whisper: token k takes the k-th spoken word's start."""
    toks = sc.narration.split()
    if not ws or not toks:
        return []
    at = lambda k: ws[round(k * (len(ws) - 1) / max(len(toks) - 1, 1))]["start"]
    return [(t, max(0, round(at(k) * fps) - sc.start_frame)) for k, t in enumerate(toks)]


def build(sb: Storyboard, bounds: list[tuple[float, float]], words: list[dict]) -> Storyboard:
    fps, cursor = sb.meta.fps, 0
    for sc, (s, e) in zip(sb.scenes, bounds):
        # round cumulative boundaries (not durations) so rounding never drifts; min 1 s per scene
        end = max(round(e * fps), cursor + fps)
        sc.start_frame, sc.duration_frames, cursor = cursor, end - cursor, end
        sc.cues = []
        if sb.meta.theme.endswith("shorts"):
            sc.words = captions(sc, [w for w in words if s - 0.01 <= w["start"] < e], fps)
        for ref, word in cue_targets(sc):
            t = find_cue(word, words, s, e)
            if t is not None:
                sc.cues.append(Cue(ref=ref, word=word, offset_frames=max(0, min(round(t * fps) - sc.start_frame, sc.duration_frames - 1))))
    sb.meta.total_frames = cursor + round(sb.meta.disclaimer_seconds * fps)
    return sb


def _title(sc) -> str:
    p = sc.props
    t = p.get("title") or p.get("quote") or p.get("heading") or " ".join(sc.narration.split()[:6])
    return t.strip().rstrip(".?!,:;")[:60]  # keep the planner's own capitalisation (IPO, SEBI, NII)


def chapters(sb: Storyboard) -> str:
    """YouTube chapters: first at 00:00, each >= 30 s long, at least 3 (else none)."""
    fps, rows, last = sb.meta.fps, [], None
    for sc in sb.scenes:
        s = sc.start_frame / fps
        if last is None or s - last >= 30:  # ~8-10 chapters for a 5 min video
            rows.append((s, _title(sc)))
            last = s
    if len(rows) < 3:
        return ""
    fmt = lambda s: f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{int(s % 60):02d}" if s >= 3600 else f"{int(s // 60):02d}:{int(s % 60):02d}"
    return "\n".join(f"{fmt(s)} {t}" for s, t in rows) + "\n"
