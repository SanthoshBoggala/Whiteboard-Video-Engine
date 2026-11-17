# Whiteboard / Illustrated Explainer Engine: Low-Level Design

Status: Implemented, updated 2026-11-17 · Companion to `HLD.md` (read that first)

Scope change since HLD v1: two **themes** are supported, selected per project:
- `whiteboard`: Excalidraw look (rough.js shapes, charcoal on off-white).
- `illustrated`: bold lettering, rounded frame, flat colour illustrations that pop in (reference screenshot style). Adds an asset stage.

> **Current-state notes (2026-11-17).** Where this document and the code differ, the code wins. Differences:
> - Layout adds `pipeline/0b_review_storyboard.py`, `6_publish_kit.py`, `align.py`, `frames.py` (pure logic, unit-tested), `gimages.py`, `iconify.py`, `pixabay.py` (asset sources), `list_models.py`, `pronounce.json` (spoken-only respellings), `prompts/review_scenes.md`, `prompts/publish_kit.md`, `tts/{say,edge,clone,fake}.py`. There is no `schema/` dir: `models.py` defines the schema and `renderer/src/types.ts` mirrors it.
> - Renderer: `themes/index.ts` (one file, 7 themes), `lib/rough.tsx`, components `shared.tsx`, `Cartoon.tsx`, `Shorts.tsx` in addition to those listed. Fonts are bundled in `renderer/public/fonts`.
> - `run.sh` takes `--story`, `--out`, `--no-review`, `--no-kit`, `--no-gen`, and stage `--from 0..6`. State is per story under `output/<name>/` (`WBVE_OUT`, `WBVE_PUBLIC`), so there are no `.stageN.done` files. `run_many.sh` runs several stories in parallel.
> - `4_master_audio.py` reads `input/bg_music.mp3` (git-ignored, supply your own). ffmpeg is optional (loudness and ducking only).
> - Tests: a single `tests/test_pipeline.py` with fixtures in `tests/fixtures/`.
> - Git: `.gitignore` excludes secrets, venv, `node_modules`, `output/`, generated `renderer/public/{assets,storyboard.json,mixed.wav}` and all of `input/` except `story.txt`. `themes/*.png` are preview screenshots only (not read by code).

## 1. Repository layout (final)

```
whiteboard-video-engine/
├── HLD.md  LLD.md  README.md
├── .env.example  .gitignore            # .env, output/, node_modules, .venv ignored
├── run.sh
├── requirements.txt                    # faster-whisper, google-genai, pydantic, python-dotenv, rapidfuzz, pytest
├── input/        story.txt  voiceover.wav(opt)  bg_music.mp3(opt)
├── pipeline/
│   ├── common.py                       # paths, env, ffprobe helper, logging, stage-cache check
│   ├── models.py                       # pydantic: Storyboard, Scene, Props*, Asset, Cue, Word
│   ├── 0_plan_scenes.py
│   ├── 1_voiceover.py
│   ├── tts/ __init__.py base.py gemini.py local.py
│   ├── 2_transcribe_sync.py
│   ├── 2b_resolve_assets.py            # illustrated theme only
│   ├── 3_generate_storyboard.py
│   ├── 4_master_audio.py
│   ├── prompts/plan_scenes.md          # planner system prompt (versioned file)
│   └── schema/storyboard.schema.json   # exported from models.py (single source of truth)
├── renderer/                           # Remotion
│   ├── package.json  tsconfig.json  remotion.config.ts
│   ├── public/ assets/ icons/ fonts/   # populated by pipeline / bundled
│   └── src/
│       ├── Root.tsx  VideoComposition.tsx  types.ts   # types.ts generated from JSON schema
│       ├── themes/ whiteboard.ts  illustrated.ts  index.ts
│       ├── lib/ rough.ts  useDrawOn.ts  usePopIn.ts  Frame.tsx
│       └── components/
│           TitleCard  ComparisonSplit  FlowchartNodes  BarChartAnimated
│           MathFormulaBox  ChecklistCard  DisclaimerCard
│           IllustrationScene  SpeechBubble  QuoteTitle      # illustrated additions
├── output/  (generated)  draft_storyboard.json  scenes/*.wav  voice.wav  words.json
│            assets/*  storyboard.json  mixed.wav  final_video.mp4  youtube_chapters.txt
└── tests/   test_align.py  test_frames.py  test_schema.py  fixtures/
```

`models.py` is the single schema source: it exports `storyboard.schema.json`, which is used (a) as the Gemini response schema, (b) to generate `renderer/src/types.ts` (via `json-schema-to-typescript`), (c) for validation in stages 0 and 3.

## 2. Data models (`pipeline/models.py`)

```python
Theme = Literal["whiteboard", "illustrated"]
SceneType = Literal["TitleCard","ComparisonSplit","FlowchartNodes","BarChartAnimated",
                    "MathFormulaBox","ChecklistCard","IllustrationScene","QuoteTitle"]

class Asset(BaseModel):          # illustrated theme
    id: str
    query: str                   # icon keyword, e.g. "store"
    prompt: str | None           # image-gen fallback prompt
    cue_word: str | None         # word that triggers pop-in
    path: str | None = None      # filled by 2b (relative to renderer/public)

class Cue(BaseModel):
    ref: str                     # element id inside props (asset id, node id, bar label, step index)
    word: str
    offset_frames: int           # relative to scene start

class Scene(BaseModel):
    id: str                      # s01..
    type: SceneType
    narration: str
    props: dict                  # validated per type by PROPS_MODEL[type]
    assets: list[Asset] = []
    cues: list[Cue] = []         # filled by stage 3
    start_frame: int = 0         # filled by stage 3
    duration_frames: int = 0     # filled by stage 3

class Meta(BaseModel):
    fps: int = 60; width: int = 1920; height: int = 1080
    theme: Theme; audio: str = "mixed.wav"
    disclaimer: str; disclaimer_seconds: float = 4.0
    total_frames: int = 0

class Storyboard(BaseModel):
    meta: Meta; scenes: list[Scene]
```

Per-type props (all frozen pydantic models, `extra="forbid"`):

| Type | Props |
|---|---|
| TitleCard | `title: str`, `subtitle?: str` |
| QuoteTitle | `number?: int`, `quote: str`, `body?: str` |
| ComparisonSplit | `left`, `right`: `{label, items[str], accent: blue\|green\|red}` |
| FlowchartNodes | `nodes[{id,label}]`, `edges[{from,to}]` (max 6 nodes, laid out in a row or snake) |
| BarChartAnimated | `bars[{label, value, color}]`, `unit?`, `callouts[{bar, text}]` |
| MathFormulaBox | `steps[{expr, note?}]`, `highlight_last: bool` |
| ChecklistCard | `items[str]`, `disclaimer?: str` |
| IllustrationScene | `heading?: str`, `body: str`, `bubble?: {text, anchor_asset}`, uses `scene.assets` (max 6, grid layout) |

Planner limits (enforced by validation): scene narration 15 to 60 words, at most 6 list items, at most 6 assets, bar values > 0, text lengths capped per field so layouts never overflow.

## 3. Pipeline stages

### 3.0 `0_plan_scenes.py`
- CLI: `--story input/story.txt --theme illustrated --out output/draft_storyboard.json [--manual]`.
- Flow: read story → build prompt from `prompts/plan_scenes.md` (theme-specific rules, component catalogue, limits) → `genai.Client().models.generate_content(model=GEMINI_MODEL, contents=..., config={"response_mime_type":"application/json","response_schema": <schema>})` → parse → `Storyboard.model_validate` → per-scene `PROPS_MODEL[type].model_validate(props)`.
- Retry once on validation error, feeding the error text back into the prompt. Second failure aborts with the raw output saved to `output/plan_error.json`.
- Narration is checked against the story: concatenated scene narration must keep ≥ 95% of story words (rapidfuzz ratio), so the LLM cannot silently drop content.
- `--manual`: prints the full prompt and schema, then reads JSON from stdin or a file.
- Gemini schema note: union-typed `props` may not be supported by the structured-output schema subset. Fallback: `props` as one flat object with all optional fields, then strict per-type validation locally. Decide when building.
- Adds `ponytail`-style hard stop: draft is written, then the pipeline pauses (`run.sh` prompts "edit draft, press Enter") unless `--yes`.

### 3.1 `1_voiceover.py`
- Modes: `--tts gemini|local` (default from `TTS_BACKEND`) or `--voice path.wav` (recorded).
- TTS interface (`tts/base.py`): `class TTS(Protocol): def synthesize(self, text: str, out_wav: Path) -> None`. Output normalized to mono 24 kHz or 48 kHz WAV.
  - `gemini.py`: Gemini TTS model; response is raw PCM, wrapped with `wave` (16-bit mono, sample rate from the response mime type). Voice from `GEMINI_TTS_VOICE`. Retries with backoff on 429/5xx.
  - `local.py`: Piper subprocess (`piper --model <onnx> --output_file`), or Kokoro Python call, selected by `LOCAL_TTS_ENGINE`. Model auto-downloaded to `~/.cache/wbve/` on first use.
- TTS mode: one clip per scene → `output/scenes/sNN.wav`; durations via `ffprobe`; gap of `0.35 s` silence appended per scene; concatenated with the ffmpeg concat demuxer → `output/voice.wav`. Writes `output/scene_timing.json` (`{scene_id: {start_s, end_s}}`), which stage 3 uses directly.
- Recorded mode: copies the file to `output/voice.wav` (converted to 48 kHz mono with ffmpeg). No timing file; stage 2 produces timings.

### 3.2 `2_transcribe_sync.py`
- `WhisperModel(WHISPER_MODEL, compute_type="int8")` → `transcribe(voice.wav, word_timestamps=True, language=<auto or env>)` → flat `words.json`: `[{w, start, end}]`.
- Always run (also in TTS mode, because word times give the cues). Cached by hash of `voice.wav`.
- **Scene alignment** (recorded mode only): tokenise story words and scene narrations (lowercase, strip punctuation, digits normalised, e.g. "13" and "thirteen" tolerated via `num2words`). Build one token list of all scenes with scene indices. Run `difflib.SequenceMatcher(None, scene_tokens, whisper_tokens, autojunk=False)` → matched blocks give anchors. Scene start = start time of the first whisper word matched in that scene; unmatched scenes inherit from neighbours (interpolate by token count). Scene end = next scene start; last scene end = audio end.
- **Cue extraction** (both modes): for each cue-bearing element in a scene (asset `cue_word`; or, for list/step props, element text's first meaningful word), find the first whisper word inside the scene window with `rapidfuzz.fuzz.ratio ≥ 80` against `cue_word`. Missing match → fallback: spread evenly across the scene's first 70% of duration. Output `output/cues.json`.

### 3.2b `2b_resolve_assets.py` (illustrated theme only)
- For each `Asset`:
  1. **Icon lookup:** `renderer/public/icons/index.json` (`{file, tags[]}`, built once from OpenMoji SVGs; license CC BY-SA 4.0, so credit in the video description). Score = tag overlap with `query` (rapidfuzz token_set_ratio); accept ≥ 85.
  2. **Image-gen fallback:** Gemini image model with `prompt` + a fixed style suffix ("flat vector illustration, thick clean outlines, solid colours, plain white background, no text"). Saves PNG to `renderer/public/assets/<hash>.png`.
  3. Cache key = sha1(query+prompt+style suffix); never regenerate a cached asset.
- Sets `asset.path`. No background removal needed: the theme canvas is white, and images are composited with `mix-blend-mode: multiply`.
- `--no-gen` disables step 2 (missing assets fall back to a labelled placeholder box).

### 3.3 `3_generate_storyboard.py`
Inputs: draft storyboard, `scene_timing.json` (TTS) or alignment from stage 2, `cues.json`, `voice.wav` length.

Frame math (avoids drift by rounding cumulative boundaries, not durations):
```python
start_f[i]    = round(start_s[i] * fps)
duration_f[i] = round(end_s[i] * fps) - start_f[i]        # >= fps (min 1 s)
total_audio_f = round(audio_len_s * fps)
total_frames  = total_audio_f + round(disclaimer_seconds * fps)
cue.offset_frames = max(0, round(word_start_s * fps) - start_f[i])
```
- Asserts: scenes contiguous (`start[i+1] == start[i] + dur[i]`), first start 0, last end == `total_audio_f`, all ints.
- Writes `output/storyboard.json` and `youtube_chapters.txt`: first line `00:00 <title of scene 1>`; chapter titles from `TitleCard.title` / `QuoteTitle.quote` / first 6 words of narration; only scenes ≥ 10 s apart, at least 3 chapters (YouTube rule), timestamps `MM:SS` (or `H:MM:SS`).

### 3.4 `4_master_audio.py`
Voice normalise (single-pass `loudnorm`; two-pass if drift > 1 LU on verify):
```
ffmpeg -i voice.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11,apad=pad_dur=<disclaimer_s>" voice_norm.wav
```
With background music (looped, trimmed, ducked by sidechain, music base gain 0.25):
```
ffmpeg -i voice_norm.wav -stream_loop -1 -i bg_music.mp3 -filter_complex \
 "[0:a]asplit=2[v][sc];[1:a]volume=0.25[m];\
  [m][sc]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400[duck];\
  [v][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95" -t <total_s> mixed.wav
```
No music → `mixed.wav` = `voice_norm.wav`. Verify step: re-measure integrated loudness; warn if outside -14 ± 1.5 LUFS.

## 4. Renderer (Remotion)

### 4.1 Composition
- `Root.tsx` registers one `<Composition id="Video" fps={60} width={1920} height={1080}>` with `calculateMetadata` loading `storyboard.json` (copied to `public/`) to set `durationInFrames = meta.total_frames`.
- `VideoComposition.tsx`: background from theme; `<Audio src={staticFile("mixed.wav")}/>`; for each scene `<Sequence from={start_frame} durationInFrames={duration_frames}>` rendering `COMPONENTS[scene.type]` with `{props, assets, cues, theme}`; final `<Sequence>` for `DisclaimerCard` over the last `disclaimer_seconds`.
- Scene-to-scene: 8-frame cross-fade (opacity), no translation, so the hand-drawn look stays calm.
- `--fast` render flags: `--scale=0.667 --fps` override handled by composition prop `fast`, which halves frame rate via `--every-nth-frame=2` and renders at 1280x720.

### 4.2 Shared helpers (`lib/`)
- `rough.ts`: `const gen = rough.generator()`; `roughRect/roughLine/roughArrow/roughCircle(opts)` return SVG path strings; **fixed `seed` derived from element id** (hash) so strokes never jitter; `roughness: 1.2`, `bowing: 1`, theme stroke width.
- `useDrawOn(startFrame, durFrames, pathD)` → `{strokeDasharray, strokeDashoffset}` using `@remotion/paths` (`getLength`, `evolvePath`); ease `Easing.out(Easing.cubic)`.
- `usePopIn(cueFrame)` → `{scale, opacity}` using `spring({fps, frame: frame - cueFrame, config:{damping:12, stiffness:140}})`, 0 before the cue.
- `Frame.tsx`: rounded border (theme-dependent): `illustrated` = solid 10 px black rounded rect inset 30 px; `whiteboard` = rough.js rectangle drawn on during the first 20 frames.
- Text auto-fit: `fitText` from `@remotion/layout-utils` per text block, so long LLM text never overflows.

### 4.3 Themes (`themes/*.ts`)
| Token | whiteboard | illustrated |
|---|---|---|
| bg | `#FAFAFA` | `#FFFFFF` |
| ink | `#1E1E1E` | `#000000` |
| accent blue/green/red | `#2563EB / #16A34A / #DC2626` | same |
| heading font | Architects Daughter (via `@remotion/google-fonts`) | condensed bold caps (candidate: Bebas Neue / Oswald, chosen at build time) |
| body font | Inter | same as heading, lighter weight |
| stroke style | rough.js | solid clean |
| illustrations | none | allowed |

### 4.4 Component behaviour (cue = frame offset from `cues`, else timed fractions of the scene)
| Component | Animation |
|---|---|
| TitleCard | border draws on (0-24f), title types/fades in, subtitle at cue or 40% |
| QuoteTitle | frame, number, quote lines reveal word-by-word in sync with narration words (uses `words.json` slice), body fades in |
| ComparisonSplit | two rough cards slide-draw; items reveal one by one at cues; accent underline |
| FlowchartNodes | nodes pop in at cues; arrow to each node draws on over 18f after its node |
| BarChartAnimated | axis draws, bars grow `0 → value` over 30f at cue, value label counts up, callout arrow draws |
| MathFormulaBox | box draws; each step fades in at cue; last step highlighted with accent underline/circle |
| ChecklistCard | rows appear at cues; check mark draws on; optional disclaimer line in small text |
| IllustrationScene | heading + body text left, asset grid right (2-3 columns); each asset `usePopIn(cue)`; speech bubble anchored to asset |
| SpeechBubble | rounded rect with tail path, scale-in with overshoot, accent text |
| DisclaimerCard | static text for final seconds, fades in 12f, text from `meta.disclaimer` |

## 5. CLI and orchestration

`run.sh` (bash, `set -euo pipefail`):
```
usage: ./run.sh [--theme whiteboard|illustrated] [--tts gemini|local] [--voice FILE]
                [--fast] [--yes] [--manual] [--from STAGE]
```
Sequence: venv check → load `.env` → stage 0 → pause for review (skipped with `--yes`) → 1 → 2 → 2b (illustrated) → 3 → 4 → `npx remotion render Video output/final_video.mp4 --codec=h264 --crf=18 --concurrency=<cores/2>` (copies `storyboard.json`, `mixed.wav` into `renderer/public` first).
`--from N` skips earlier stages. Each stage writes `output/.stageN.done` containing an input hash; unchanged inputs mean skip, so edits to `draft_storyboard.json` re-run only 1 onward.

## 6. Error handling

| Failure | Behaviour |
|---|---|
| Missing `GEMINI_API_KEY` / ffmpeg / node | Preflight in `common.preflight()` fails fast with the exact fix command |
| Gemini 429/5xx | Exponential backoff ×4, then message suggesting `--manual` or `--tts local` |
| Planner JSON invalid twice | Save raw output, exit non-zero |
| Whisper alignment coverage < 80% of tokens | Warn, fall back to proportional split by narration token count |
| Cue word not found | Evenly spaced fallback, logged |
| Asset not found and `--no-gen` | Placeholder box with label, logged |
| Render crash | Remotion log kept in `output/render.log`; storyboard re-validated first |

## 7. Testing

- `tests/test_frames.py`: contiguity, rounding drift over 200 scenes, min-duration rule, chapters formatting (`MM:SS`, ≥3 entries).
- `tests/test_align.py`: fixture words with "13"/"thirteen", dropped and added filler words, missing scene → interpolation.
- `tests/test_schema.py`: every props model accepts a good sample and rejects overflow lengths and unknown keys; JSON schema export is up to date.
- Renderer: `npx remotion still` for each component with fixture props at several frames (snapshot images, eyeballed, not pixel-diffed in v1).
- Smoke test: `fixtures/sample_story.txt` (~120 words) with `--tts local --yes --fast` produces an mp4 whose duration matches `total_frames / fps ± 0.1 s` (checked with ffprobe).
- Stubs: Gemini planner and TTS get a fake client via env `WBVE_FAKE_GEMINI=1`, so tests run without a key or network.

## 8. Build order (maps to HLD phases)

1. `models.py`, schema export, `types.ts` generation, `common.py`, tests for schema.
2. Renderer skeleton: Root, VideoComposition, themes, `lib/`, then components in order: TitleCard, ChecklistCard, QuoteTitle, IllustrationScene (with sample assets), ComparisonSplit, FlowchartNodes, MathFormulaBox, BarChartAnimated, DisclaimerCard. Render a hand-written `storyboard.json` end to end (silent) as the first milestone.
3. `0_plan_scenes.py` + prompt, `--manual`, fake client.
4. TTS backends, `1_voiceover.py`, `2_transcribe_sync.py`, `3_generate_storyboard.py`, `4_master_audio.py` (**needs ffmpeg**).
5. `2b_resolve_assets.py`, icon index.
6. `run.sh`, stage caching, README, full smoke test.

## 9. Open items to settle during build
- Gemini structured-output support for union `props` (flat-object fallback ready).
- Gemini TTS and image model names, limits and free-tier quotas (check docs at build time).
- Exact heading font for the illustrated theme; Virgil licence for the whiteboard theme.
- Piper vs Kokoro as the default local engine (pick whichever installs cleanly on macOS and Ubuntu).
- OpenMoji attribution text for the video description.
- Python: system 3.9 is too old, so use a venv from Homebrew Python 3.14.
- ffmpeg install is still pending your approval.
