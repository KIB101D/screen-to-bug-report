# Eval: gemini-3.1-flash-lite, 1 fps, media HIGH, upload=files

Run at 2026-11-17T21:35:27.275Z. Timestamps count as correct within ±2 s.

| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r1-normal.mov | 1 | gemini-3.1-flash-lite | reproducible ✓ | 5/6 | 2/3 | 0 | 1 | 9.8 s | $0.0024 |
| r2-silent-action.mov | 1 | gemini-3.1-flash-lite | reproducible ✓ | 5/8 | 2/4 | 0 | 1 | 9.9 s | $0.0019 |
| r3-not-visible.mov | 1 | gemini-3.1-flash-lite | reproducible ✗ | 4/7 | 2/2 | 1 | 1 | 10.4 s | $0.0021 |

Average: 10.1 s and $0.0021 per recording (paid-tier list prices, retries included, hosting excluded).

## Details

### r1-normal.mov run 1
- ✓ ⏱✗ step:select-electronics: #2 at 0.6s (exp 6.0s)
- ✓ ⏱✓ step:open-page-2: #3 at 12.8s (exp 14.5s)
- ✓ ⏱✓ failure: 14.6s (exp 15.0s): The category filter reset to 'All' after clicking the page '2' button.
- ✗ claim:category-reset: not found
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)

### r2-silent-action.mov run 1
- ✓ ⏱✗ step:search-lamp: #1 at 2.5s (exp 5.5s)
- ✗ ⏱✓ step:select-electronics: #2 at 8.5s (exp 9.5s); narrated=false, expected true
- ✗ ⏱✗ step:open-page-2: not found
- ✓ ⏱✓ failure: 12.0s (exp 13.0s): After clicking the page 2 button, the category filter automatically resets from 'Electronics' to 'All', broadening the search results.
- ✗ claim:category-dropped: not found
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: reproducible (exp reproducible)

### r3-not-visible.mov run 1
- ✓ ⏱✓ step:select-home: #2 at 6.3s (exp 6.5s)
- ✓ ⏱✓ step:open-page-2: #3 at 11.2s (exp 12.5s)
- ✗ failure:none: invented: The category filter reset to 'All' after clicking the page number
- ✗ claim:claims-reset: “The filter resets to all again” supported=yes (exp no)
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✗ verdict: reproducible (exp not_visible)
- ⚠ fabrication: visible failure invented: The category filter reset to 'All' after clicking the page number
