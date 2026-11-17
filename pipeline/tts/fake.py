from pathlib import Path

from common import write_pcm_wav


class FakeTTS:
    """Silence, 0.38 s per word. For tests and layout previews."""

    def synthesize(self, text: str, out_wav: Path):
        write_pcm_wav(out_wav, b"\0\0" * int(24000 * 0.38 * max(len(text.split()), 1)), 24000)
