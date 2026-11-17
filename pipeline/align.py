"""Scene/word alignment and cue extraction. Pure functions, unit-tested."""
import bisect
import re
from difflib import SequenceMatcher

from rapidfuzz import fuzz

try:
    from num2words import num2words
except ImportError:  # digits then only match digits
    num2words = None


def toks(text: str) -> list[str]:
    out = []
    for t in re.findall(r"[a-z0-9']+", text.lower().replace(",", "")):
        if t.isdigit() and num2words:
            out.extend(re.findall(r"[a-z]+", num2words(int(t))))  # "13" -> thirteen
        else:
            out.append(t)
    return out


def align_scenes(narrations: list[str], words: list[dict], audio_len: float):
    """Return ([(start_s, end_s)] per scene, coverage 0..1). Scene 0 starts at 0, last ends at audio_len."""
    n = len(narrations)
    st, owner = [], []
    for i, nar in enumerate(narrations):
        t = toks(nar)
        st += t
        owner += [i] * len(t)
    wt, widx = [], []
    for j, w in enumerate(words):
        t = toks(w["w"])
        wt += t
        widx += [j] * len(t)

    first = [None] * n  # earliest matched whisper start per scene
    matched = 0
    for blk in SequenceMatcher(None, st, wt, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            matched += 1
            i, s = owner[blk.a + k], words[widx[blk.b + k]]["start"]
            if first[i] is None or s < first[i]:
                first[i] = s

    cum = [0]
    for i in range(n):
        cum.append(cum[-1] + owner.count(i))
    known = [(0, 0.0)] + [(cum[i], first[i]) for i in range(1, n) if first[i] is not None] + [(cum[n], audio_len)]
    xs = [k[0] for k in known]
    starts = [0.0]
    for i in range(1, n):
        if first[i] is not None:
            t = first[i]
        else:  # linear interpolation by token position between known anchors
            j = bisect.bisect_right(xs, cum[i])
            (x0, t0), (x1, t1) = known[j - 1], known[min(j, len(known) - 1)]
            t = t0 + (t1 - t0) * ((cum[i] - x0) / (x1 - x0) if x1 > x0 else 0)
        starts.append(max(t, starts[-1]))
    ends = starts[1:] + [audio_len]
    return list(zip(starts, ends)), matched / max(len(st), 1)


def uniform_words(narrations: list[str], bounds: list[tuple[float, float]]) -> list[dict]:
    """Fake word timings (evenly spread inside each scene) for synthetic audio / no-whisper runs."""
    out = []
    for nar, (s, e) in zip(narrations, bounds):
        ws = nar.split()
        span = (e - s) * 0.9 / max(len(ws), 1)
        out += [{"w": w, "start": s + k * span, "end": s + (k + 1) * span} for k, w in enumerate(ws)]
    return out


def find_cue(word: str, words: list[dict], lo: float, hi: float) -> float | None:
    target = " ".join(toks(word))
    if not target:
        return None
    for w in words:
        if lo <= w["start"] < hi and fuzz.ratio(target, " ".join(toks(w["w"]))) >= 80:
            return w["start"]
    return None


def _sig(text: str) -> str:
    ws = toks(text)
    return max(ws, key=len) if ws else ""


def cue_targets(scene) -> list[tuple[str, str]]:
    """(element ref, trigger word) for everything in a scene that animates on a spoken word."""
    p, out = scene.props, []
    out += [(a.id, a.cue_word or a.query.split()[0]) for a in scene.assets]
    out += [(f"item.{i}", _sig(x)) for i, x in enumerate(p.get("items", [])) if scene.type == "ChecklistCard"]
    for side in ("left", "right"):
        if side in p:
            out += [(f"{side}.{i}", _sig(x)) for i, x in enumerate(p[side]["items"])]
    out += [(f"node.{n['id']}", _sig(n["label"])) for n in p.get("nodes", [])]
    out += [(f"bar.{i}", _sig(b["label"])) for i, b in enumerate(p.get("bars", []))]
    out += [(f"step.{i}", _sig(s.get("note") or s["expr"])) for i, s in enumerate(p.get("steps", []))]
    return [(r, w) for r, w in out if w]
