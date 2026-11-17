import re
from pathlib import Path

from common import ROOT, die, env, wav_concat


class CloneTTS:
    """Your own voice, cloned locally with F5-TTS (MLX, Apple Silicon). No API, no key.

    Setup: record 10-20 s of clean speech -> input/my_voice.wav, and type exactly what you said
    into input/my_voice.txt. Override paths with CLONE_REF_AUDIO / CLONE_REF_TEXT in .env.
    """

    def __init__(self):
        self.audio = ROOT / env("CLONE_REF_AUDIO", "input/my_voice.wav")
        self.text = ROOT / env("CLONE_REF_TEXT", "input/my_voice.txt")
        if not self.audio.exists() or not self.text.exists():
            die(f"clone voice needs {self.audio} (10-20 s recording) and {self.text} (its exact transcript)")
        try:
            from f5_tts_mlx.generate import generate
        except ImportError:
            die("run: .venv/bin/pip install f5-tts-mlx   (Apple Silicon only)")
        self.generate = generate
        self.ref_text = self.text.read_text().strip()

    def synthesize(self, text: str, out_wav: Path):
        # One call per sentence: the library's own multi-sentence loop reuses the first sentence's duration (bug).
        # estimate_duration takes the pace from YOUR sample; the default predictor runs too fast.
        parts = []
        for i, s in enumerate(x for x in re.split(r"(?<=[.!?])\s+", text.strip()) if x):
            p = out_wav.with_suffix(f".part{i}.wav")
            self.generate(generation_text=s, ref_audio_path=str(self.audio), ref_audio_text=self.ref_text,
                          output_path=str(p), estimate_duration=True, steps=int(env("CLONE_STEPS", "8")),
                          speed=float(env("CLONE_SPEED", "1.0")), seed=42)
            parts.append(p)
        wav_concat(parts, out_wav, gap_s=0.25)
        for p in parts:
            p.unlink()
