# Whiteboard Explainer Video Engine: High-Level Design

Status: Implemented (v1 + addenda below) · Updated: 2026-11-17 · Use: personal

## 1. Purpose

Turn a plain-text story (finance, market mechanics, technical explainers) into a 1080p 60fps whiteboard-style (Excalidraw look) explainer video with a synced voiceover, YouTube chapters, and an end disclaimer card. Runs locally from a CLI.

### Goals
- Input is mostly **text**; **voice** (own recording) is optional.
- Hand-drawn look: off-white canvas, charcoal strokes, blue/green/red accents.
- Schema-driven: video is data (`storyboard.json`), not generated render code.
- Audio-first timing: scene length comes from the audio, animations hit on key words.
- Both TTS backends supported: **Gemini TTS** and **local TTS**.
- Scene planning uses **Gemini** (no Claude at runtime).

### Non-goals (v1)
- No GUI or web app, no multi-user or cloud deployment.
- No free-form per-video code generation.
- No video editing (cuts, stock footage, avatars).
- No auto-upload to YouTube.

### Addendum (2026-11-15): themes
Two themes are selected per project: `whiteboard` (rough.js shapes, as described here) and `illustrated` (bold lettering, rounded frame, flat colour illustrations that pop in on cue). The illustrated theme adds an asset-resolution stage (icon library first, Gemini image generation as fallback) and three components (IllustrationScene, SpeechBubble, QuoteTitle). Details are in `LLD.md`.

### Addendum (2026-11-17): current state
The sections below are the original v1 design; the implementation has grown beyond it:
- **Themes (7):** `whiteboard`, `illustrated`, `dark`, `paper`, `cartoon` (16:9) and `shorts`, `papershorts` (vertical Shorts). Scene types: the 6 originals plus `QuoteTitle`, `IllustrationScene`, `CartoonScene` and the Shorts set (`ShortHook`, `ShortCards`, `ShortDonut`, `ShortLine`, `ShortStat`, `ShortList`).
- **Extra stages:** `0b_review_storyboard.py` (second Gemini pass that fixes visuals, never narration) and `6_publish_kit.py` (thumbnail via headless Chrome, title, description, hashtags, chapters, pinned comment).
- **TTS backends (6):** `gemini`, `local` (piper/kokoro), `say` (macOS), `edge`, `clone` (reference voice in `input/my_voice.*`), `fake` (tests).
- **Asset sources** (illustrated/cartoon): comma list `IMAGE_SOURCE` of `pixabay`, `iconify`, `google`, `gemini`; first hit wins, results cached in `renderer/public/assets/`.
- **Per-story output folders:** `output/<story-name>/` so several stories can render in parallel (`run_many.sh`). `run.sh` stages are now 0 to 6 (5 = render, 6 = publish kit), `--from N` resumes.
- **Repo hygiene:** only source, docs, tests, fonts and `input/story.txt` are tracked. `.env`, `.venv`, `node_modules`, `output/`, generated assets and personal inputs (voice samples, music) are git-ignored.

## 2. System context

```
                 +--------------------+
  story.txt ---->|                    |----> final_video.mp4
  voiceover.wav->|  Whiteboard Video  |----> youtube_chapters.txt
  bg_music.mp3 ->|      Engine        |----> storyboard.json
  .env (keys) -->|   (local CLI)      |
                 +---------+----------+
                           |
              +------------+-------------+
              v                          v
      Gemini API (planning,        Local tools: ffmpeg,
      optional TTS)                Piper/Kokoro, Whisper, Chrome
```

External dependencies: Gemini API (planning, optional TTS), `ffmpeg`, `faster-whisper` (local model), Remotion (bundles headless Chromium), optional Piper/Kokoro.

## 3. Pipeline overview

```
 story.txt
    |
    v
[0 plan_scenes]  Gemini + JSON schema --> draft_storyboard.json   (human review/edit)
    |
    v
[1 voiceover]   TTS backend (gemini|local)  OR  recorded voiceover.wav
    |                 -> per-scene clips + voice.wav
    v
[2 transcribe]  faster-whisper --> word timestamps (aligned to scene text)
    |
    v
[3 storyboard]  seconds -> frames @60fps, validate, chapters
    |                 -> storyboard.json, youtube_chapters.txt
    v
[4 master_audio] ffmpeg: voice -14 LUFS, duck bg music --> mixed.wav
    |
    v
[5 render]      Remotion + rough.js --> final_video.mp4 (1920x1080, 60fps, H.264)
```

Stages communicate only through files in `output/`. Each stage can be re-run alone, and stages whose inputs have not changed are skipped.

## 4. Components

| # | Component | Tech | Responsibility |
|---|-----------|------|----------------|
| 0 | `0_plan_scenes.py` | Python, `google-genai` | Split story into scenes, choose component type, fill props, split narration. Schema-constrained output, local re-validation, one retry. |
| 1 | `1_voiceover.py` + `tts_gemini.py` / `tts_local.py` | Python, ffmpeg | One clip per scene via chosen backend; concatenate. Recorded mode skips TTS. |
| 2 | `2_transcribe_sync.py` | Python, faster-whisper | Word-level timestamps; align to scene narration (fuzzy match); extract cue words. |
| 3 | `3_generate_storyboard.py` | Python, pydantic/jsonschema | Final timings in frames, validation, chapters file. |
| 4 | `4_master_audio.py` | Python, ffmpeg | `loudnorm` to -14 LUFS; `sidechaincompress` to duck music. |
| 5 | `renderer/` | Remotion, React, TypeScript, roughjs | Render storyboard to video. |
| - | `run.sh` | bash | Orchestrates all stages. Flags: `--tts`, `--voice`, `--fast`, `--manual`, `--from <stage>`. |

### 4.1 Visual component library (6 templates)
| Component | Use | Key props |
|---|---|---|
| TitleCard | Hook title with sketch border | title, subtitle |
| ComparisonSplit | A vs B cards | left{label, items, accent}, right{...} |
| FlowchartNodes | Steps with animated arrows | nodes[], edges[] |
| BarChartAnimated | Bars / quota split, callouts | bars[{label, value, color}], callouts[] |
| MathFormulaBox | Step-by-step calculation | steps[{expr, note}], highlight |
| ChecklistCard | Progressive bullets, final disclaimer | items[], disclaimer? |

Every component takes `cues[]` (frame offsets from word timestamps) so that elements draw in when the narrator says the matching phrase.

### 4.2 Theme
Canvas `#FAFAFA`, stroke `#1E1E1E`, accents `#2563EB` / `#16A34A` / `#DC2626`. Fonts: Virgil (check license) / Architects Daughter / Inter, bundled locally. rough.js uses a fixed seed per element so the sketch does not jitter between frames.

## 5. Data contract: `storyboard.json`

```json
{
  "meta": { "fps": 60, "width": 1920, "height": 1080, "totalFrames": 0,
            "audio": "mixed.wav", "disclaimer": "..." },
  "scenes": [
    {
      "id": "s01",
      "type": "TitleCard | ComparisonSplit | FlowchartNodes | BarChartAnimated | MathFormulaBox | ChecklistCard",
      "narration": "text spoken in this scene",
      "startFrame": 0,
      "durationFrames": 420,
      "cues": [ { "word": "thirteen", "frame": 130 } ],
      "props": { }
    }
  ]
}
```
- `props` has one JSON schema per `type`. The same schema is used for the Gemini response schema, Python validation and the TypeScript types.
- Rules: scenes are contiguous, so each `startFrame` equals the previous start plus its duration. `totalFrames` equals the audio length plus the disclaimer card. All frame values are integers.

## 6. Key design decisions

| Decision | Choice | Why |
|---|---|---|
| Renderer | Remotion + rough.js | Crisp vector output, frame-exact sync, reusable React components. Free for personal use. |
| Scene planning | Gemini structured output | User choice; schema forces valid JSON. |
| Human review gate | Draft saved to disk, edit before render | LLM output varies; cheap to fix before an expensive render. |
| TTS | Pluggable: `gemini` / `local` | User needs both. Single `synthesize(text, out)` interface. |
| Per-scene TTS clips | Concatenate clips | Exact scene durations for free. |
| Sync for recorded voice | faster-whisper + fuzzy align | Recordings don't match text exactly. |
| File-based stage handoff | JSON/WAV in `output/` | Debuggable, resumable. |
| Secrets | `.env`, git-ignored | Keep API keys out of code. |
| Offline fallback | `--manual` prints prompt and reads pasted JSON | Works if API or quota fails. |

## 7. Configuration (`.env`)
```
GEMINI_API_KEY=
GEMINI_MODEL=            # planning model, switchable
TTS_BACKEND=gemini       # gemini | local
GEMINI_TTS_VOICE=
LOCAL_TTS_ENGINE=piper   # piper | kokoro
WHISPER_MODEL=small
```

## 8. Directory structure
```
whiteboard-video-engine/
├── HLD.md
├── .env / .env.example
├── input/    story.txt, voiceover.wav (optional), bg_music.mp3 (optional)
├── pipeline/ 0_plan_scenes.py  1_voiceover.py  tts_gemini.py  tts_local.py
│             2_transcribe_sync.py  3_generate_storyboard.py  4_master_audio.py
│             schema/  (JSON schemas shared by Python and TS)
├── renderer/ Remotion project (Root, VideoComposition, theme, components/)
├── output/   draft_storyboard.json, storyboard.json, voice.wav, mixed.wav,
│             final_video.mp4, youtube_chapters.txt
└── run.sh
```

## 9. Non-functional considerations
- **Performance:** 1080p60 render is slow. `--fast` renders 1280x720 at 30fps for previews.
- **Determinism:** fixed rough.js seeds, and storyboard and audio are cached, so re-renders are identical.
- **Failure handling:** a failed stage stops the run with a clear message, and `--from <stage>` resumes. Gemini calls get one validated retry.
- **Privacy:** story text is sent to Gemini (planning, and TTS if selected). Local TTS plus `--manual` keeps everything offline.
- **Compliance (YouTube):** fully synthetic voice risks "inauthentic content" for monetization. The recommended workflow is TTS drafts, then own recording for the final. Disclaimer card appended automatically and customizable.
- **Licensing:** Remotion is free for individuals. Virgil font license to verify.

## 10. Environment status and prerequisites
| Item | Status |
|---|---|
| Node 24 / npm 11 | Present |
| Python | System 3.9 (too old). Homebrew 3.14 available, use a venv |
| ffmpeg | **Missing.** Install declined so far; required from stage 1 onward |
| Gemini API key | User to provide via `.env` |
| Piper/Kokoro models | One-time download when local TTS is first used |
| Target OS | Spec says Ubuntu. Dev machine is macOS, so keep code portable |

## 11. Delivery phases
1. **Foundations:** scaffold, schemas, `theme.ts`, rough.js helpers. *(no installs)*
2. **Renderer:** 6 components, `VideoComposition`, preview in Remotion Studio. *(no installs)*
3. **Planning:** `0_plan_scenes.py` with Gemini and `--manual`, review gate.
4. **Audio and sync:** TTS backends, recorded mode, Whisper alignment, storyboard generation, audio mastering. *(needs ffmpeg)*
5. **Integration:** `run.sh`, `--fast`, sample story end-to-end smoke test, README.

## 12. Risks and open items
| Risk / open item | Mitigation |
|---|---|
| ffmpeg not installed | Install via brew when approved, or user installs |
| Gemini returns weak scene choices | Review gate, prompt iteration, `--manual` |
| Whisper misaligns on noisy or off-script audio | Fuzzy match with scene-level fallback timing |
| Gemini TTS limits and quality unknown | Check at build time; local backend as fallback |
| Remotion render time at 60fps | `--fast` preview, concurrency flag |
| Virgil font license | Verify, otherwise use Architects Daughter |
| Python 3.9 on system | venv from Homebrew Python 3.14 |
