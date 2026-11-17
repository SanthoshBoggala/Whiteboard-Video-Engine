"""draft_storyboard.json -> output/voice.wav (+ mode.json, scene_timing.json in TTS mode)."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import wave
from pathlib import Path

import tts
from common import OUTPUT, die, env, have_ffmpeg, load_env, wav_concat, wav_duration
from models import Storyboard

GAP_S = 0.2  # silence after each scene
TITLE_HOLD_S = 1.2
PRON = Path(__file__).parent / "pronounce.json"  # spoken-only respellings (QIB -> Q I B); on-screen text is untouched


def pad_tail(clip: Path, secs: float):
    with wave.open(str(clip)) as w:
        params, frames = w.getparams(), w.readframes(w.getnframes())
    with wave.open(str(clip), "wb") as o:
        o.setparams(params)
        o.writeframes(frames + b"\0" * (int(params.framerate * secs) * params.sampwidth * params.nchannels))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tts", choices=["gemini", "local", "say", "edge", "clone", "fake"])
    ap.add_argument("--voice", help="recorded voiceover file (skips TTS)")
    a = ap.parse_args()
    load_env()
    out = OUTPUT / "voice.wav"

    if a.voice:
        src = Path(a.voice)
        if not src.exists():
            die(f"{src} not found")
        if have_ffmpeg():  # always re-encode: fixes mislabelled files (mp3 named .wav), stereo, odd sample rates
            subprocess.run(["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", str(out)], check=True, capture_output=True)
        elif src.suffix.lower() == ".wav":
            shutil.copy(src, out)
        else:
            die("non-WAV voiceover needs ffmpeg (brew install ffmpeg) - or convert it to WAV yourself")
        (OUTPUT / "mode.json").write_text(json.dumps({"mode": "recorded"}))
        print(f"recorded voice -> {out}")
        return

    sb = Storyboard.model_validate_json((OUTPUT / "draft_storyboard.json").read_text())
    name = a.tts or env("TTS_BACKEND", "gemini")
    backend = tts.get(name)
    clips_dir = OUTPUT / "scenes"
    clips_dir.mkdir(exist_ok=True)
    clips, timing, t = [], [], 0.0
    for sc in sb.scenes:
        # cache key = scene id + narration + backend, so a changed story never reuses old audio
        spoken = sc.narration
        for w, r in (json.loads(PRON.read_text()) if PRON.exists() else {}).items():
            spoken = re.sub(rf"\b{re.escape(w)}\b", r, spoken)
        first = sc is sb.scenes[0]  # title scene: hold ~1.2 s after the hook so the title can be read
        key = hashlib.sha1(f"{first}|{name}|{ {'say': env('SAY_VOICE'), 'edge': env('EDGE_VOICE', 'en-US-GuyNeural') + env('EDGE_RATE')}.get(name, '') }|{spoken}".encode()).hexdigest()[:8]
        clip = clips_dir / f"{sc.id}_{key}.wav"
        if not clip.exists():
            print(f"tts[{name}] {sc.id}")
            backend.synthesize(spoken, clip)
            if first:
                pad_tail(clip, TITLE_HOLD_S)
        d = wav_duration(clip) + GAP_S
        clips.append(clip)
        timing.append([t, t + d])
        t += d
    wav_concat(clips, out, gap_s=GAP_S)
    (OUTPUT / "scene_timing.json").write_text(json.dumps(timing))
    (OUTPUT / "mode.json").write_text(json.dumps({"mode": "tts", "backend": name}))
    print(f"voice.wav {t:.1f}s from {len(clips)} scenes")


if __name__ == "__main__":
    main()
