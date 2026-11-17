# Whiteboard / Illustrated Explainer Engine

Story text -> storyboard -> voiceover -> synced Remotion render. Design: `HLD.md`, `LLD.md`.

Only source, docs, tests, fonts and `input/story.txt` are tracked in git; see `.gitignore` (outputs, `.env`, venv, voice/music inputs are local-only). Add your own `input/bg_music.mp3` (optional) and `input/my_voice.{wav,txt}` (for `--tts clone`).

## Setup
```
python3.14 -m venv .venv && .venv/bin/pip install -r requirements.txt   # any Python >= 3.11
(cd renderer && npm install)
cp .env.example .env      # add GEMINI_API_KEY
```
Optional: `brew install ffmpeg` (loudness -14 LUFS + music ducking; everything else works without it).
Rendering uses installed Google Chrome if present (set `CHROME_PATH` to override).

## Run
```
# put your story in input/story.txt
./run.sh --theme whiteboard --tts gemini            # draft video with Gemini voice
./run.sh --theme illustrated --tts local            # local TTS (piper/kokoro, see .env)
./run.sh --voice input/voiceover.wav                # your own recording (aligned with Whisper)
./run.sh --fast                                     # 960x540 preview
./run.sh --from 3                                   # resume at stage 3 (after editing the draft)
WBVE_FAKE_GEMINI=1 ./run.sh --tts fake --yes        # offline smoke test, no keys
```
`run.sh` pauses after planning so you can edit `output/draft_storyboard.json`; `--yes` skips the pause.
`--manual` prints the planner prompt for use in any chat model, then reads the JSON you paste back.

Outputs: `output/final_video.mp4`, `output/youtube_chapters.txt`, `output/storyboard.json`.

## Illustrated theme assets
Drop SVG/PNG icons into `renderer/public/icons/` named by keyword (`store.svg`, `piano.png`). Missing ones are
generated with Gemini (cached in `renderer/public/assets/`), or shown as labelled placeholder boxes with `--no-gen`.

## Tests / preview
```
.venv/bin/python -m pytest tests
cd renderer && npm run studio       # Remotion Studio; reads public/storyboard.json
```
`tests/fixtures/sample_storyboard.{whiteboard,illustrated}.json` use all 8 scene types (copy one to `renderer/public/storyboard.json`).
