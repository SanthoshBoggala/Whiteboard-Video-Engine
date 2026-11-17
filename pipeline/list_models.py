"""Print the models your GEMINI_API_KEY can use, so .env names never go stale.
usage: .venv/bin/python pipeline/list_models.py [filter]   e.g. flash | tts | image
"""
import sys

from common import die, env, load_env

load_env()
if not env("GEMINI_API_KEY"):
    die("GEMINI_API_KEY missing in .env")
from google import genai

client = genai.Client(api_key=env("GEMINI_API_KEY"))
want = sys.argv[1].lower() if len(sys.argv) > 1 else ""
for m in client.models.list():
    if want in m.name.lower():
        print(m.name.removeprefix("models/"), "|", ",".join(getattr(m, "supported_actions", None) or []))
