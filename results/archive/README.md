# Archived experiments

Runs made while choosing the model and settings on 2026-11-17. The final results are one level up in `results/summary-gemini-3.5-flash-lite-high.md`. File names follow the model that was configured, which is not always the model that answered; check the "Answered by" column.

| File | What it is |
| --- | --- |
| `summary-gemini-2.5-flash.md`, `summary-gemini-2.5-pro-high.md` | Both models return 404 for new API keys. |
| `summary-gemini-3.8-flash.md`, `*.gemini-3.8-flash.run1.json` | First run, low media resolution. 3.8 and 3.7 Flash were overloaded, every report came from the fallback `gemini-3.1-flash-lite`. Scored with the first, literal matcher (missed "page number 2"). |
| `summary-gemini-3.8-flash-high.md` | Same at high media resolution; again every report came from the fallback `gemini-3.1-flash-lite`. |
| `summary-gemini-3.1-flash-lite-high.md`, `*.gemini-3.1-flash-lite.high.run1.json` | `gemini-3.1-flash-lite` called directly, high resolution, with the evidence rule in the prompt. Invents a visible failure and its quoted evidence in R3. |
| `summary-gemini-3.5-flash-high.md`, `summary-gemini-3.6-flash-high.md` | 503 (overloaded) on every call. |
| `summary-gemini-4-argon-high.md`, `summary-gemini-4-carbon-high.md`, `summary-gemini-omni-flash-preview-high.md` | 429: free-tier quota of 0 for these models. |
| `summary-gemini-4-hydrogen-high.md`, `*.gemini-4-hydrogen.high.run1.json` | Answered on the free tier (run at 21:46 UTC). All verdicts right, R2 6/8, but 43–132 s and ≈ $0.028 per recording. The summary was rebuilt with `npm run summary` after the model's price was added, so cost is computed from stored token counts. |
