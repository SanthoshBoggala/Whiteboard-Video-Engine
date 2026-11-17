"""TTS backends. Interface: get(name).synthesize(text, out_wav) writes a mono 16-bit WAV."""


def get(name: str):
    if name == "gemini":
        from .gemini import GeminiTTS as C
    elif name == "local":
        from .local import LocalTTS as C
    elif name == "fake":
        from .fake import FakeTTS as C
    elif name == "say":
        from .say import SayTTS as C
    elif name == "edge":
        from .edge import EdgeTTS as C
    elif name == "clone":
        from .clone import CloneTTS as C
    else:
        raise SystemExit(f"error: unknown TTS backend '{name}' (gemini|local|say|edge|clone|fake)")
    return C()
