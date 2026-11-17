import os
import shutil
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "input"
# run.sh sets WBVE_OUT / WBVE_PUBLIC per story, so several stories can run in parallel without sharing any file
OUTPUT = Path(os.environ.get("WBVE_OUT") or ROOT / "output")
PUBLIC = Path(os.environ.get("WBVE_PUBLIC") or ROOT / "renderer" / "public")
OUTPUT.mkdir(parents=True, exist_ok=True)


def load_env():
    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / ".env")
    except ImportError:
        pass


def env(key: str, default: str = "") -> str:
    return os.environ.get(key) or default


def die(msg: str):
    sys.exit(f"error: {msg}")


def have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


# --- WAV helpers (stdlib only, so TTS mode needs no ffmpeg) -------------------------------------
def wav_duration(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def wav_concat(clips: list[Path], out: Path, gap_s: float = 0.0, tail_s: float = 0.0):
    """Join same-format WAVs, `gap_s` of silence after each clip, plus `tail_s` at the end."""
    with wave.open(str(clips[0])) as w:
        params = w.getparams()
    unit = params.sampwidth * params.nchannels
    sil = lambda s: b"\0" * (int(params.framerate * s) * unit)
    with wave.open(str(out), "wb") as o:
        o.setparams(params)
        for c in clips:
            with wave.open(str(c)) as w:
                if w.getparams()[:3] != params[:3]:
                    die(f"{c.name}: audio format differs from first clip")
                o.writeframes(w.readframes(w.getnframes()))
            o.writeframes(sil(gap_s))
        o.writeframes(sil(tail_s))


def write_pcm_wav(path: Path, pcm: bytes, rate: int):
    with wave.open(str(path), "wb") as o:
        o.setnchannels(1)
        o.setsampwidth(2)
        o.setframerate(rate)
        o.writeframes(pcm)
