# Eval: gemini-3.8-flash (fallback gemini-3.7-flash, gemini-3.1-flash-lite), 1 fps, media HIGH, upload=files

Run at 2026-11-17T21:26:19.663Z. Timestamps count as correct within ±2 s.

| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r1-normal.mov | 1 | gemini-3.1-flash-lite | reproducible ✓ | 5/6 | 3/3 | 0 | 1 (+4 busy) | 248.5 s | $0.0022 |
| r2-silent-action.mov | 1 | gemini-3.1-flash-lite | reproducible ✓ | 5/8 | 2/4 | 0 | 1 (+4 busy) | 20.6 s | $0.0018 |
| r3-not-visible.mov | 1 | gemini-3.1-flash-lite | reproducible ✗ | 4/7 | 2/2 | 1 | 1 (+5 busy) | 118.1 s | $0.0018 |

Average: 129.0 s and $0.0019 per recording (paid-tier list prices, retries included, hosting excluded).

## Details

### r1-normal.mov run 1
- ✓ ⏱✓ step:select-electronics: #1 at 6.8s (exp 6.0s)
- ✓ ⏱✓ step:open-page-2: #2 at 14.1s (exp 14.5s)
- ✓ ⏱✓ failure: 15.1s (exp 15.0s): The category dropdown changes from 'Electronics' to 'All' when navigating to the second page, and the page shows all products instead of filtered products.
- ✗ claim:category-reset: not found
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)

### r2-silent-action.mov run 1
- ✓ ⏱✗ step:search-lamp: #1 at 2.5s (exp 5.5s)
- ✗ ⏱✓ step:select-electronics: #2 at 8.0s (exp 9.5s); narrated=false, expected true
- ✗ ⏱✗ step:open-page-2: not found
- ✓ ⏱✓ failure: 12.0s (exp 13.0s): The category filter reverts to 'All' after clicking on a different page of results.
- ✗ claim:category-dropped: not found
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: reproducible (exp reproducible)

### r3-not-visible.mov run 1
- ✓ ⏱✓ step:select-home: #1 at 5.5s (exp 6.5s)
- ✓ ⏱✓ step:open-page-2: #2 at 11.2s (exp 12.5s)
- ✗ failure:none: invented: The category dropdown changes from 'Home' to 'All'
- ✗ claim:claims-reset: “The filter resets to all again” supported=yes (exp no)
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✗ verdict: reproducible (exp not_visible)
- ⚠ fabrication: visible failure invented: The category dropdown changes from 'Home' to 'All'
