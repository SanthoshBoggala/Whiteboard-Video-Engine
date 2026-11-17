#!/usr/bin/env bash
# Story text -> explainer video + YouTube kit (thumbnail, title, description, hashtags).
# Every story gets its own folder output/<story-name>/, so several stories can run at the same time (see run_many.sh).
# usage: ./run.sh [--theme whiteboard|illustrated|dark|paper|cartoon|shorts|papershorts] [--tts gemini|local|say|edge|clone|fake] [--voice FILE]
#                 [--story FILE] [--out NAME] [--fast] [--no-gen] [--yes] [--manual] [--no-review] [--no-kit] [--from 0|1|2|3|4|5|6]
set -euo pipefail
cd "$(dirname "$0")"

THEME=whiteboard; TTS=""; VOICE=""; STORY=input/story.txt; NAME=""; FAST=0; NOGEN=""; YES=0; MANUAL=""; REVIEW=1; KIT=1; FROM=0
while [ $# -gt 0 ]; do
  case "$1" in
    --theme) THEME=$2; shift 2;;  --tts) TTS=$2; shift 2;;  --voice) VOICE=$2; shift 2;;
    --story) STORY=$2; shift 2;;  --out) NAME=$2; shift 2;;  --fast) FAST=1; shift;;   --no-gen) NOGEN=--no-gen; shift;;   --yes) YES=1; shift;;
    --manual) MANUAL=--manual; REVIEW=0; shift;;  --no-review) REVIEW=0; shift;;  --no-kit) KIT=0; shift;;  --from) FROM=$2; shift 2;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
done

PY=.venv/bin/python
[ -x "$PY" ] || { echo "no .venv: python3.11+ -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2; exit 1; }
[ -f "$STORY" ] || { echo "story file not found: $STORY" >&2; exit 1; }
[ -d renderer/node_modules ] || (cd renderer && npm install)
command -v ffmpeg >/dev/null || echo "note: ffmpeg not found; audio will not be loudness-normalised or ducked (brew install ffmpeg)" >&2

# one folder per story: output/<name>/ (same story again = same folder, so --from N resumes it)
if [ -n "$NAME" ]; then ID=$NAME; else ID=$(basename "$STORY"); ID=${ID%.*}; fi
ID=$(printf %s "$ID" | tr -c 'A-Za-z0-9_.-' '_')
export WBVE_OUT="$PWD/output/$ID" WBVE_PUBLIC="$PWD/output/$ID/public"
mkdir -p "$WBVE_PUBLIC"
[ -d "$WBVE_PUBLIC/fonts" ] || cp -R renderer/public/fonts "$WBVE_PUBLIC/fonts"
echo "== $ID  (theme $THEME)  ->  output/$ID/"

step() { [ "$FROM" -le "$1" ]; }

if step 0; then
  $PY pipeline/0_plan_scenes.py --story "$STORY" --theme "$THEME" $MANUAL
  [ "$REVIEW" = 1 ] && $PY pipeline/0b_review_storyboard.py --story "$STORY"  # second Gemini pass: fixes visuals, never touches narration
  if [ "$YES" = 0 ]; then
    read -r -p "[$ID] Review/edit output/$ID/draft_storyboard.json, then press Enter to continue (Ctrl-C to stop) "
  fi
fi
if step 1; then
  if [ -n "$VOICE" ]; then $PY pipeline/1_voiceover.py --voice "$VOICE"
  elif [ -f input/voiceover.wav ] && [ -z "$TTS" ]; then $PY pipeline/1_voiceover.py --voice input/voiceover.wav
  else $PY pipeline/1_voiceover.py ${TTS:+--tts "$TTS"}; fi
fi
step 2 && $PY pipeline/2_transcribe_sync.py
if step 2 && [ "$THEME" = illustrated ]; then $PY pipeline/2b_resolve_assets.py $NOGEN; fi
step 3 && $PY pipeline/3_generate_storyboard.py
step 4 && $PY pipeline/4_master_audio.py

if step 5; then
  ARGS=(--codec=h264 --crf=18)
  [ "$FAST" = 1 ] && ARGS=(--codec=h264 --crf=28 --scale=0.5)
  (cd renderer && npx remotion render src/index.ts Video "$WBVE_OUT/final_video.mp4" --public-dir="$WBVE_PUBLIC" "${ARGS[@]}" --concurrency="${WBVE_CONCURRENCY:-50%}")
  echo "video: output/$ID/final_video.mp4"
fi

# last step: thumbnail + title + description + hashtags (Gemini writes the text, headless Chrome draws the thumbnail)
if step 6 && [ "$KIT" = 1 ]; then
  $PY pipeline/6_publish_kit.py --story "$STORY" --theme "$THEME" || echo "note: publish kit failed (the video is fine); retry with --from 6" >&2
fi
echo "done: output/$ID/  (final_video.mp4, youtube_package.txt, thumbnail.png, youtube_chapters.txt)"
