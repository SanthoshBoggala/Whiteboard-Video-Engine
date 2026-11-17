"""voice.wav -> output/words.json + output/bounds.json (per-scene [start_s, end_s])."""
import json
import sys

from align import align_scenes, uniform_words
from common import OUTPUT, die, env, load_env, wav_duration
from models import Storyboard


def transcribe(path) -> list[dict]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        die("faster-whisper not installed (pip install -r requirements.txt)")
    model = WhisperModel(env("WHISPER_MODEL", "small"), compute_type="int8")
    segs, _ = model.transcribe(str(path), word_timestamps=True)
    return [{"w": w.word.strip(), "start": w.start, "end": w.end} for s in segs for w in s.words]


def main():
    load_env()
    sb = Storyboard.model_validate_json((OUTPUT / "draft_storyboard.json").read_text())
    nar = [s.narration for s in sb.scenes]
    mode = json.loads((OUTPUT / "mode.json").read_text())
    audio_len = wav_duration(OUTPUT / "voice.wav")

    if mode["mode"] == "tts":
        bounds = json.loads((OUTPUT / "scene_timing.json").read_text())
        # fake audio is silent; real TTS gets real word times from whisper
        words = uniform_words(nar, bounds) if mode.get("backend") == "fake" else transcribe(OUTPUT / "voice.wav")
    else:
        words = transcribe(OUTPUT / "voice.wav")
        bounds, cov = align_scenes(nar, words, audio_len)
        if cov < 0.8:
            print(f"warning: only {cov:.0%} of script words matched the audio; timings are partly interpolated", file=sys.stderr)
    (OUTPUT / "words.json").write_text(json.dumps(words))
    (OUTPUT / "bounds.json").write_text(json.dumps(bounds))
    print(f"{len(words)} words, {len(bounds)} scene bounds")


if __name__ == "__main__":
    main()
