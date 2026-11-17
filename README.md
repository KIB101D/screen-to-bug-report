# Screen recording → bug report

Upload a screen recording (MP4/MOV/WebM, up to 90 s, one browser workflow, optional narration by one speaker). The app returns a bug report with:

- starting conditions visible in the recording;
- ordered steps, including actions the speaker never mentions;
- the observed failure with a frame and timecode;
- every fact marked as **on screen**, **speaker says** or **unknown**, with no invented stack traces, causes or expected behaviour;
- click any step to jump the player to its frame; export as Markdown or JSON;
- measured time to result, tokens and cost for that run.

`/demo` is a small store with a real defect: after you pick a category and change page, the category resets to All. `/demo?fixed=1` is the same page without the defect.

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
| `src/lib/analyze.ts` | Pipeline: upload, wait, generate, validate, retry, timings |
| `src/lib/cost.ts`, `src/lib/config.ts` | Token accounting, price table, limits |
| `src/app/api/analyze`, `src/app/api/upload` | Streaming analysis route, Blob client-upload token route |
| `src/components/` | Upload flow and report view |
| `src/app/demo`, `src/lib/demo` | Demo store with the defect (`pageHref` in `query.ts`) |
| `expected/`, `recordings/`, `scripts/eval.ts` | Test set and the evaluation script |

## Run locally

```bash
npm install
cp .env.example .env.local      # add GEMINI_API_KEY
# without a Blob store, add NEXT_PUBLIC_UPLOAD_MODE=direct to .env.local
npm run dev                     # http://localhost:3000 and http://localhost:3000/demo
```

## Deploy on Vercel

1. Import the repository in Vercel.
2. Storage → create a Blob store and connect it to the project (adds `BLOB_READ_WRITE_TOKEN`). If the store is private, also set `BLOB_ACCESS=private` and `NEXT_PUBLIC_BLOB_ACCESS=private`.
3. Settings → Environment Variables → `GEMINI_API_KEY`.
4. Deploy. `/api/analyze` sets `maxDuration = 300`.

Uploaded recordings are deleted from Blob and from the Gemini Files API right after analysis.

## Evaluate

Expected facts for each recording live in `expected/*.json` and were written before the first run. Put the videos into `recordings/` and run:

```bash
npm run eval                    # every recording once
npm run eval -- --runs 2        # stability check
GEMINI_MODEL=gemini-3.5-flash npm run eval
```

The script sends each file through the same pipeline as the web app, then writes `results/<recording>.<model>.run<N>.json` and `results/summary-<model>.md` with facts found, timestamps within ±2 s, fabrications, attempts, time and cost.

To add a new input: record it, write `expected/<name>.json` first, then run `npm run eval -- expected/<name>.json`.
