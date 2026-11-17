import asyncio
import subprocess
import tempfile
import time
from pathlib import Path

from common import die, env, have_ffmpeg


class EdgeTTS:
    """Microsoft neural voices via the free edge-tts package (unofficial endpoint, needs internet, no key).

    .env: EDGE_VOICE=en-US-GuyNeural  (en-IN-PrabhatNeural, en-GB-RyanNeural ...)   EDGE_RATE=+0%  (e.g. -5%, +10%)
    Your narration text is sent to Microsoft's servers. Personal use only.
    """

    def __init__(self):
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            die("run: .venv/bin/pip install edge-tts")
        if not have_ffmpeg():
            die("the edge backend needs ffmpeg (mp3 -> wav)")
        self.voice, self.rate = env("EDGE_VOICE", "en-US-GuyNeural"), env("EDGE_RATE", "+0%")

    def synthesize(self, text: str, out_wav: Path):
        import edge_tts

        with tempfile.TemporaryDirectory() as d:
            mp3 = Path(d) / "c.mp3"
            for attempt in range(3):  # the endpoint drops connections now and then
                try:
                    asyncio.run(edge_tts.Communicate(text, self.voice, rate=self.rate).save(str(mp3)))
                    break
                except Exception as e:
                    if attempt == 2:
                        die(f"edge-tts failed after 3 tries ({type(e).__name__}: {e}). Check your internet, or use --tts say")
                    time.sleep(2)
            subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(out_wav)],
                           check=True, capture_output=True)
