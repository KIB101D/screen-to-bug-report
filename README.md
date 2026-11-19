# Screen recording → bug report

**Live demo: https://screen-to-bug-report.vercel.app** · demo store with the defect: [/demo](https://screen-to-bug-report.vercel.app/demo) · fixed version: [/demo?fixed=1](https://screen-to-bug-report.vercel.app/demo?fixed=1)

Upload a screen recording of a broken flow (MP4/MOV/WebM, up to 90 s, one browser workflow, optional narration by one speaker) and get a bug report a developer can reproduce:

- starting conditions visible in the recording;
- ordered steps with a frame each, including actions the speaker never mentions;
- the observed failure with a timecode and the on-screen text that proves it (before → after);
- every fact marked **on screen**, **speaker says** or **unknown**; no invented stack traces, causes or expected behaviour;
- a clear verdict: `reproducible`, `not_visible` (the speaker claims a failure the screen does not show) or `needs_clarification`;
- click any step or time to jump the player to that frame; export as Markdown or JSON;
- measured time to result, tokens and cost for that run.

`/demo` is a small store with a real defect: pick a category, change page, and the category resets to All. `/demo?fixed=1` is the same page without the defect.

## Supported input

| | This app | Gemini API |
| --- | --- | --- |
| Formats | MP4, MOV, WebM | `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`, `video/x-flv`, `video/mpg`, `video/webm`, `video/wmv`, `video/3gpp` |
| Length | up to 90 s (scope of the brief) | up to 1 hour at high media resolution with a 1M-token context |
| Size | up to 100 MB | Files API: 2 GB per file on the free tier, 20 GB on the paid tier |
| Audio | used: narration is analysed together with the frames | audio and visual streams are both processed |
| Sampling | 1 frame per second, high media resolution, static processing | 1 fps by default; fast motion between frames can be missed |

The app accepts only formats a browser can play, because the report's frames are captured in the browser from the uploaded file: AVI, WMV, FLV, MPEG and 3GPP would reach Gemini but could not be shown or scrubbed in the report. macOS and iOS screen recordings (MOV or MP4, H.264 + AAC) work as they are; browsers report MOV as `video/quicktime`, which the Files API accepts.

Why these settings: high media resolution because, per Google, higher resolution improves reading fine text, which is what UI labels are; static processing because Google recommends it for short clips, where the newer agentic mode adds reasoning and tool round-trips. Limits are set in `src/lib/config.ts`.

Source: Gemini API, [Video understanding](https://ai.google.dev/gemini-api/docs/video-understanding) (supported formats, input methods, technical details).

## Results

Expected facts were written to `expected/*.json` before the first run. Final configuration: `gemini-3.5-flash-lite`, 1 fps, high media resolution.

| Recording | What it tests | Verdict | Facts | Timecodes ±2 s | Invented facts |
| --- | --- | --- | --- | --- | --- |
| R1 normal | narrated lead-up and failure | ✓ ×2 | 5/6, 5/6 | 3/3, 3/3 | 0 |
| R2 silent action | unnarrated search, "page three… sorry, two" | ✓ ×2 | 5/8, 5/8 | 4/4, 3/4 | 0 |
| R3 not visible | speaker claims a failure on the fixed page | `not_visible` ✓ ×2 | 7/7, 7/7 | 2/2, 2/2 | 0 |
| R4 new input | recorded after tuning, "Next →" button | ✓ | 6/6 | 3/3 | 0 |

Pipeline time 7–38 s per recording (median 8 s) and ≈ $0.003 per recording at paid-tier list prices. Full table: `results/summary-gemini-3.5-flash-lite-high.md`; model experiments: `results/archive/`. Method, failures and decisions: `DELIVERY.md`.

## Stack

Next.js 16 (App Router, TypeScript) on Vercel · Gemini API via `@google/genai` (Files API + `responseSchema`) · `zod` validation with one retry · Vercel Blob for uploads larger than the 4.5 MB function body limit · thumbnails grabbed in the browser with `<canvas>`, so no ffmpeg on the server.

```
browser ── upload ──▶ Vercel Blob
   │                     │
   └─ POST /api/analyze ─┴▶ server downloads ─▶ Gemini Files API (wait for ACTIVE)
                                              ─▶ generateContent(video, prompt, responseSchema)
                                              ─▶ zod + duration checks ─▶ retry once if invalid
   ◀── NDJSON stream: stages … report + metrics
```

| Path | What |
| --- | --- |
| `src/lib/report/schema.ts` | Report contract: zod schema, cross-field rules, Gemini response schema |
| `src/lib/report/prompt.ts` | System prompt (evidence rules) |
| `src/lib/analyze.ts` | Pipeline: upload, wait, generate, validate, retry, overload backoff, timings |
| `src/lib/cost.ts`, `src/lib/config.ts` | Token accounting, price table, model and limits |
| `src/app/api/analyze`, `src/app/api/upload` | Streaming analysis route, Blob client-upload token route |
| `src/components/` | Upload flow and report view |
| `src/app/demo`, `src/lib/demo` | Demo store with the defect (`pageHref` in `query.ts`) |
| `expected/`, `recordings/`, `scripts/eval.ts`, `results/` | Test set, evaluation script and its output |

## Run locally

```bash
npm install
cp .env.example .env.local      # add GEMINI_API_KEY
# without a Blob store, add NEXT_PUBLIC_UPLOAD_MODE=direct to .env.local
npm run dev                     # http://localhost:3000 and http://localhost:3000/demo
npm run models                  # models your key can call
```

## Deploy on Vercel

1. Import the repository in Vercel.
2. Storage → create a Blob store and connect it to the project (adds `BLOB_READ_WRITE_TOKEN`). If the store is private, also set `BLOB_ACCESS=private` and `NEXT_PUBLIC_BLOB_ACCESS=private`.
3. Settings → Environment Variables → `GEMINI_API_KEY`.
4. Deploy. `/api/analyze` sets `maxDuration = 300`.

Uploaded recordings are deleted from Blob and from the Gemini Files API right after analysis.

## Evaluate

```bash
npm run eval                                        # every recording once
npm run eval -- --runs 2                            # stability check
npm run eval -- expected/r4-next-button.json        # one recording
GEMINI_MODEL=gemini-3.8-flash npm run eval          # another model
GEMINI_MEDIA_RESOLUTION=LOW npm run eval            # cheaper frames
```

Each run writes `results/<recording>.<model>.<resolution>.run<N>.json` and `results/summary-<model>-<resolution>.md` with facts found, timecodes within ±2 s, invented facts, attempts, time and cost. A run on a subset of recordings writes its own summary file instead of overwriting the full one. `npm run summary -- <model> <resolution>` rebuilds a summary from saved runs without calling the API.

To add a new input: record it, write `expected/<name>.json` first and commit, then run `npm run eval -- expected/<name>.json`. Scenario scripts for R1–R4 are in `expected/RECORDING-GUIDE.md`.
