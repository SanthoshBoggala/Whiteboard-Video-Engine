import shutil
import subprocess
from pathlib import Path

from common import die, env


class SayTTS:
    """macOS built-in voice. Free, offline, no setup; draft quality. Voice via SAY_VOICE (see `say -v '?'`)."""

    def __init__(self):
        if not shutil.which("say"):
            die("the 'say' backend only works on macOS; use --tts local or --voice")

    def synthesize(self, text: str, out_wav: Path):
        cmd = ["say", "-o", str(out_wav), "--file-format=WAVE", "--data-format=LEI16@24000"]
        if env("SAY_VOICE"):
            cmd += ["-v", env("SAY_VOICE")]
        subprocess.run(cmd + [text], check=True, capture_output=True)
