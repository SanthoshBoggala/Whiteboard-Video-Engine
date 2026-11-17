import shutil
import subprocess
from pathlib import Path

from common import die, env, write_pcm_wav


class LocalTTS:
    def __init__(self):
        self.engine = env("LOCAL_TTS_ENGINE", "piper")
        if self.engine == "piper":
            if not shutil.which("piper"):
                die("piper not found (pip install piper-tts) and set PIPER_MODEL to a .onnx voice")
            if not env("PIPER_MODEL"):
                die("PIPER_MODEL not set (path to a Piper .onnx voice)")
        elif self.engine == "kokoro":
            try:
                from kokoro import KPipeline
            except ImportError:
                die("kokoro not installed (pip install kokoro soundfile numpy)")
            self.k = KPipeline(lang_code="a")
        else:
            die(f"unknown LOCAL_TTS_ENGINE '{self.engine}' (piper|kokoro)")

    def synthesize(self, text: str, out_wav: Path):
        if self.engine == "piper":
            subprocess.run(["piper", "--model", env("PIPER_MODEL"), "--output_file", str(out_wav)],
                           input=text.encode(), check=True, capture_output=True)
        else:
            import numpy as np

            audio = np.concatenate([np.asarray(a) for _, _, a in self.k(text, voice=env("KOKORO_VOICE", "af_heart"))])
            write_pcm_wav(out_wav, (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes(), 24000)
