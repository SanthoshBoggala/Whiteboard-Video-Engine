"""voice.wav (+ bg_music.mp3) -> renderer/public/mixed.wav. Needs ffmpeg for loudness + ducking."""
import json
import shutil
import subprocess

from common import INPUT, OUTPUT, PUBLIC, env, have_ffmpeg, load_env, wav_concat, wav_duration
from models import Storyboard

MUSIC = INPUT / "bg_music.mp3"


def main():
    load_env()
    sb = Storyboard.model_validate_json((OUTPUT / "storyboard.json").read_text())
    pad = sb.meta.disclaimer_seconds
    voice, mixed = OUTPUT / "voice.wav", OUTPUT / "mixed.wav"
    total = wav_duration(voice) + pad
    if not have_ffmpeg():
        print("warning: ffmpeg not found - skipping -14 LUFS normalisation and music ducking "
              "(brew install ffmpeg). Using raw voice.", flush=True)
        wav_concat([voice], mixed, tail_s=pad)
    else:
        norm = "loudnorm=I=-14:TP=-1.5:LRA=11" + (f",apad=pad_dur={pad}" if pad > 0 else "")
        if MUSIC.exists():
            fc = (f"[0:a]asplit=2[v][sc];[1:a]volume={env('MUSIC_VOLUME', '0.10')}[m];"
                  "[m][sc]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400[duck];"
                  "[v][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,"
                  f"afade=t=out:st={max(total - 2, 0):.2f}:d=2")  # music tail fades out over the last 2 s
            cmd = ["ffmpeg", "-y", "-i", str(voice), "-af", norm, "-ar", "48000", str(OUTPUT / "voice_norm.wav")]
            subprocess.run(cmd, check=True, capture_output=True)
            subprocess.run(["ffmpeg", "-y", "-i", str(OUTPUT / "voice_norm.wav"), "-stream_loop", "-1", "-i", str(MUSIC),
                            "-filter_complex", fc, "-t", f"{total:.3f}", str(mixed)], check=True, capture_output=True)
        else:
            subprocess.run(["ffmpeg", "-y", "-i", str(voice), "-af", norm, "-ar", "48000", str(mixed)],
                           check=True, capture_output=True)
    shutil.copy(mixed, PUBLIC / "mixed.wav")
    print(f"mixed.wav {wav_duration(mixed):.1f}s -> renderer/public/mixed.wav")


if __name__ == "__main__":
    main()
