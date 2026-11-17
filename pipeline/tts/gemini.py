import re
import time
from pathlib import Path

from common import die, env, write_pcm_wav


class GeminiTTS:
    def __init__(self):
        if not env("GEMINI_API_KEY"):
            die("GEMINI_API_KEY missing in .env")
        from google import genai
        from google.genai import types

        self.types = types
        self.client = genai.Client(api_key=env("GEMINI_API_KEY"))
        self.model = env("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")
        self.voice = env("GEMINI_TTS_VOICE", "Kore")

    def synthesize(self, text: str, out_wav: Path):
        t = self.types
        cfg = t.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=t.SpeechConfig(voice_config=t.VoiceConfig(
                prebuilt_voice_config=t.PrebuiltVoiceConfig(voice_name=self.voice))))
        for attempt in range(4):
            try:
                r = self.client.models.generate_content(model=self.model, contents=text, config=cfg)
                part = r.candidates[0].content.parts[0].inline_data
                rate = int(m.group(1)) if (m := re.search(r"rate=(\d+)", part.mime_type or "")) else 24000
                return write_pcm_wav(out_wav, part.data, rate)  # response is raw 16-bit mono PCM
            except Exception as e:  # 429 / 5xx / empty candidate
                if attempt == 3:
                    die(f"Gemini TTS failed: {e}. Try --tts local")
                time.sleep(2 ** attempt * 2)
