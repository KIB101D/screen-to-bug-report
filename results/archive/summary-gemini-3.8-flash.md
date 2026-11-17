# Eval: gemini-3.8-flash (fallback gemini-3.7-flash, gemini-3.1-flash-lite), 1 fps, upload=files

Run at 2026-11-17T18:35:22.565Z. Timestamps count as correct within ±2 s.

| Recording | Run | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r1-normal.mov | 1 | reproducible ✓ | 4/6 | 2/3 | 0 | 1 (+8 busy) | 304.9 s | $0.0012 |
| r2-silent-action.mov | 1 | reproducible ✓ | 4/8 | 1/4 | 0 | 1 (+8 busy) | 283.6 s | $0.0011 |
| r3-not-visible.mov | 1 | reproducible ✗ | 3/7 | 1/2 | 1 | 1 (+8 busy) | 140.7 s | $0.0012 |

Average: 243.1 s and $0.0012 per recording (paid-tier list prices, retries included, hosting excluded).

## Details

### r1-normal.mov run 1
- ✓ ⏱✓ step:select-electronics: #1 at 4.6s (exp 6.0s)
- ✗ ⏱✗ step:open-page-2: not found
- ✓ ⏱✓ failure: 15.1s (exp 15.0s): Category filter changes from 'Electronics' back to 'All' after navigating to the next page
- ✗ claim:category-reset: not found
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)

### r2-silent-action.mov run 1
- ✓ ⏱✗ step:search-lamp: #1 at 2.5s (exp 5.5s)
- ✗ ⏱✓ step:select-electronics: #2 at 7.5s (exp 9.5s); narrated=false, expected true
- ✗ ⏱✗ step:open-page-2: not found
- ✗ ⏱✗ failure: 12.0s (exp 13.0s): After selecting pagination page 3, the page jumps to showing items 6-10 on page 2 instead of the expected page 3.
- ✗ claim:category-dropped: not found
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: reproducible (exp reproducible)

### r3-not-visible.mov run 1
- ✓ ⏱✓ step:select-home: #2 at 6.3s (exp 6.5s)
- ✗ ⏱✗ step:open-page-2: not found
- ✗ failure:none: invented: Category dropdown value changes back to 'All' from 'Home' after clicking page 2
- ✗ claim:claims-reset: “the filter resets to all again” supported=yes (exp no)
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✗ verdict: reproducible (exp not_visible)
- ⚠ fabrication: visible failure invented: Category dropdown value changes back to 'All' from 'Home' after clicking page 2
