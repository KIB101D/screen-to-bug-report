# Delivery notes

## Links

- Demo: `TODO: Vercel URL` (bug demo at `/demo`, fixed version at `/demo?fixed=1`)
- Repository: https://github.com/KIB101D/screen-to-bug-report
- Walkthrough video: `TODO: link`

## What it does

Upload a screen recording (up to 90 s, one browser workflow, one optional speaker). The app sends the video with its audio to Gemini in one call, validates the JSON answer, and shows a report: starting conditions, ordered steps with frames, the observed failure with quoted on-screen evidence, the speaker's claims checked against the screen, expected behaviour only if it was said, and a list of unknowns. Every step and timecode jumps the player to its frame. The verdict is `reproducible`, `not_visible` or `needs_clarification`.

Reused: `create-next-app` scaffold, `@google/genai`, `@vercel/blob`, `zod`, Tailwind. Written for this task: the demo store and its defect, report schema and prompt, analysis pipeline with validation, retry and overload handling, cost accounting, report UI with frame capture in the browser, the evaluation script and the test set.

## Test set: inputs, expected vs actual

Expected facts for each recording are in `expected/*.json` and were committed before the first analysis run (see git history). The eval script (`npm run eval`) sends each recording through the same pipeline as the web app and compares the report with those facts. A timecode counts as correct within ±2 s. Recordings are in `recordings/` (MOV, H.264 + AAC; the app accepts MP4, MOV and WebM, the difference is only the container).

| Recording | Input | Expected | Actual (gemini-3.5-flash-lite, 2 runs) |
| --- | --- | --- | --- |
| R1 normal | `/demo`: Electronics, page 2, filter resets; everything narrated, speaker says it should stay on Electronics | 2 steps, failure at ~15 s, expected behaviour stated, `reproducible` | `reproducible` ×2; facts 5/6, 5/6; timecodes 3/3, 3/3; 0 invented |
| R2 silent action + correction | Silently types "lamp", then Electronics, says "page three… sorry, page two" | Unnarrated search step, page 2 from the screen with the correction noted, expected behaviour not stated | `reproducible` ×2; facts 5/8, 5/8; timecodes 4/4, 3/4; 0 invented |
| R3 failure not visible | `/demo?fixed=1`: Home, page 2, filter stays, speaker claims it reset | No visible failure, claim marked not supported, `not_visible` | `not_visible` ×2; facts 7/7, 7/7; timecodes 2/2, 2/2; 0 invented |
| R4 new input | Recorded after all tuning: Home, the "Next →" button, filter resets | 2 steps, failure at ~9 s, expected behaviour stated | `reproducible`; facts 6/6; timecodes 3/3; 0 invented |

Full output: `results/summary-gemini-3.5-flash-lite-high.md` and one JSON per run.

## What failed and known limits

- **R2 is the weakest case.** In both runs the model marked "Selects Electronics" as not narrated although it was, did not add a note about the "page three… sorry, page two" correction, and did not list "the category dropped again" as a claim. The steps themselves, the failure and the verdict were right.
- **R1** lists the expected behaviour but does not record "the category is back to All" as a separate claim.
- **R4** has one wrong starting condition ("page 2 is selected" at 0 s; the page was 1). The eval does not check starting conditions, so its 6/6 does not cover this. Checking them is the next eval improvement.
- **Report title for an invisible failure.** In R3 the model titles the report after the claimed symptom. The UI and the Markdown export prefix such titles with "Claimed:" whenever the verdict is not `reproducible`.
- **Model availability.** `gemini-2.5-flash` and `gemini-2.5-pro` return 404 for new API keys. `gemini-3.8-flash`, `3.7`, `3.6` and `3.5-flash` returned 503 (overloaded) for the whole evening of testing. Gemini 4 and Omni models have a free-tier quota of 0. The final model is the one that was both available and accurate, not the one planned.
- **No fallback model by default.** An overloaded main model is retried 4 times with backoff. A fallback (`GEMINI_FALLBACK_MODELS`) is opt-in because `gemini-3.1-flash-lite` invented a failure in R3; when one answers, the report shows a warning.
- **Eval matcher was fixed after the first run.** The first matcher looked for the literal "page 2" and missed "Clicks on page number 2". It now accepts paraphrases via a regular expression. The expected facts themselves did not change, and the first run was re-scored with the new matcher for the comparison below.
- Scope as in the brief: one language (English narration), one speaker, up to 90 s. Reports live in the browser tab only; there is no history or sharing link.

## How the model choice was made

All runs use the same three recordings and expected facts; R4 was recorded only after this table was final.

| Configuration | R1 facts | R2 facts | R3 | Cost / recording |
| --- | --- | --- | --- | --- |
| 3.1 Flash-Lite, low media resolution (~2k input tokens) | 5/6 | 4/8 | invented a visible failure | $0.0012 |
| 3.1 Flash-Lite, high resolution | 5/6 | 5/8 | invented a visible failure | $0.0019 |
| 3.1 Flash-Lite, high resolution, evidence rule in prompt | 5/6 | 5/8 | invented the failure and its quoted evidence | $0.0021 |
| **3.5 Flash-Lite, high resolution, evidence rule** | **5/6** | **5/8** | **`not_visible`, 7/7** | **$0.0028** |

## Time spent

About 4.5 hours of focused work: roughly 3 hours for the demo store, pipeline, report UI and eval script, then about 1.5 hours for recordings, eval runs, model selection and these notes. `TODO: adjust if needed`

## AI tools and models

- **In the product:** Gemini API, `gemini-3.5-flash-lite` (video and audio understanding, structured JSON output), via the Files API, 1 frame per second, high media resolution. Tried during evaluation: `gemini-3.1-flash-lite`, plus the unavailable models listed above.
- **For building it:** Claude (Anthropic, Claude Opus 5.5 in claude.ai) as a coding assistant for scaffolding, the pipeline, the eval script and drafting documentation. I reviewed, ran and tested the code and made the product decisions.

**Example of checking AI output.** On R3 (fixed page, speaker falsely claims the filter reset), `gemini-3.1-flash-lite` reported a visible failure. I first assumed it could not read the small label, because the run used only ~2k input tokens for a 15 s clip, so I raised the media resolution: R2 improved, R3 still failed. I then required the model to quote the on-screen text that proves the failure. It answered with `Category: Home → Category: All`, a quote that never appears in the video. The eval flagged the run as a fabrication, which showed the problem was the model, not the prompt. `gemini-3.5-flash-lite` with the same prompt passed R3 in both runs.

A second example, about the coding assistant: the first eval matcher it wrote reported "step not found" while the saved report clearly said "Clicks on page number 2". Reading the JSON next to the score exposed the matcher bug before any wrong conclusion was drawn from the numbers.

## Time to a useful result (measured)

From the start of analysis to a rendered report, eval runs on gemini-3.5-flash-lite:

| Stage | Measured |
| --- | --- |
| Upload to Gemini Files API | 2.3–3.0 s |
| Gemini video processing | ~2.3 s |
| Generation | 3–33 s |
| Total per recording (R1–R4) | 8.6–38.6 s, median ≈ 10 s |

On Vercel the browser first uploads the recording to Blob and the server downloads it; both are shown in the report's metrics panel. When the model is overloaded, retries add up to ~30 s before an error is shown. One web run during peak load took 133 s.

## Cost per recording

Measured tokens on gemini-3.5-flash-lite: about 4.6–6.5k input (video frames, audio and the prompt) and 460–510 output, no thinking tokens, one attempt per run (no validation retries were needed in the final runs).

- **Variable cost: $0.0025–0.0030 per recording**, retries included, at paid-tier list prices. Free-tier usage was priced as if paid.
- Pricing assumptions (Gemini API, standard paid tier, checked 2026-11-17): 3.5 Flash-Lite $0.30 per 1M input tokens for text, image, video and audio, $2.50 per 1M output tokens including thinking. 3.1 Flash-Lite $0.25 input / $0.50 audio / $1.50 output (copied from the same page during planning). 3.8 Flash $0.75 / $3.75, a promotional rate until 2026-12-31 that doubles from 2027-01-01.
- The API reported no separate audio token count for these models, so audio is priced inside the input total. For 3.5 Flash-Lite this changes nothing because audio and video cost the same.
- No other paid intermediaries: frame thumbnails are captured in the browser, speech is understood by the same Gemini call.
- **Hosting, separate:** Vercel Hobby and Vercel Blob, both on free plans. Recordings are deleted from Blob and from the Gemini Files API right after analysis, so storage stays near zero. Not included in the cost per operation.

## Reproducibility check by another person

`TODO: who reproduced it, on which device and browser, which report they used (attach the .md), how long it took, and anything that was unclear.`

## What I would improve next

1. **Verify the evidence independently.** Grab the frames before and after the failure (already done in the browser for thumbnails) and check the quoted text with OCR or a second vision model; downgrade the verdict if the quote is not on screen. This removes the dependence on one model not inventing evidence.
2. **Score starting conditions and claims more strictly** in the eval, and grow the test set beyond four recordings with more variety (other flows, longer clips, a recording where the app should ask for clarification).
3. **Re-run the comparison on Gemini 3.8 Flash** when it is available; the code and eval already support it via `GEMINI_MODEL`.
4. Save reports with a shareable link, so a reviewer can reproduce from a URL instead of a downloaded file.
