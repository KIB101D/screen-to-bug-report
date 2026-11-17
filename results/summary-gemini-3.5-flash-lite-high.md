# Eval: gemini-3.5-flash-lite, 1 fps, media HIGH, upload=files

Run at 2026-11-17T21:53:48.081Z. Timestamps count as correct within ±2 s.

| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r1-normal.mov | 1 | gemini-3.5-flash-lite | reproducible ✓ | 5/6 | 3/3 | 0 | 1 | 8.9 s | $0.0030 |
| r1-normal.mov | 2 | gemini-3.5-flash-lite | reproducible ✓ | 5/6 | 3/3 | 0 | 1 | 9.8 s | $0.0030 |
| r2-silent-action.mov | 1 | gemini-3.5-flash-lite | reproducible ✓ | 5/8 | 4/4 | 0 | 1 | 8.7 s | $0.0026 |
| r2-silent-action.mov | 2 | gemini-3.5-flash-lite | reproducible ✓ | 5/8 | 3/4 | 0 | 1 | 10.0 s | $0.0029 |
| r3-not-visible.mov | 1 | gemini-3.5-flash-lite | not_visible ✓ | 7/7 | 2/2 | 0 | 1 | 12.3 s | $0.0025 |
| r3-not-visible.mov | 2 | gemini-3.5-flash-lite | not_visible ✓ | 7/7 | 2/2 | 0 | 1 | 8.6 s | $0.0025 |

Average: 9.7 s and $0.0028 per recording (paid-tier list prices, retries included, hosting excluded).

## Details

### r1-normal.mov run 1
- ✓ ⏱✓ step:select-electronics: #1 at 6.8s (exp 6.0s)
- ✓ ⏱✓ step:open-page-2: #2 at 14.5s (exp 14.5s)
- ✓ ⏱✓ failure: 14.5s (exp 15.0s): Selecting pagination page resets the selected category filter back to All
- ✗ claim:category-reset: not found
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)

### r1-normal.mov run 2
- ✓ ⏱✓ step:select-electronics: #1 at 6.3s (exp 6.0s)
- ✓ ⏱✓ step:open-page-2: #2 at 13.9s (exp 14.5s)
- ✓ ⏱✓ failure: 13.9s (exp 15.0s): Category filter resets to All and pagination resets to All products when clicking page 2 while Electronics category is selected
- ✗ claim:category-reset: not found
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)

### r2-silent-action.mov run 1
- ✓ ⏱✓ step:search-lamp: #1 at 5.0s (exp 5.5s)
- ✗ ⏱✓ step:select-electronics: #2 at 9.0s (exp 9.5s); narrated=false, expected true
- ✗ ⏱✓ step:open-page-2: #3 at 12.1s (exp 12.5s); missing correction note
- ✓ ⏱✓ failure: 12.1s (exp 13.0s): Category selection resets from Electronics back to All when navigating to page 2
- ✗ claim:category-dropped: not found
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: reproducible (exp reproducible)

### r2-silent-action.mov run 2
- ✓ ⏱✗ step:search-lamp: #1 at 2.4s (exp 5.5s)
- ✗ ⏱✓ step:select-electronics: #3 at 9.2s (exp 9.5s); narrated=false, expected true
- ✗ ⏱✓ step:open-page-2: #4 at 11.8s (exp 12.5s); missing correction note
- ✓ ⏱✓ failure: 11.8s (exp 13.0s): Category selection resets to All when clicking page 2 in search results
- ✗ claim:category-dropped: not found
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: reproducible (exp reproducible)

### r3-not-visible.mov run 1
- ✓ ⏱✓ step:select-home: #2 at 7.1s (exp 6.5s)
- ✓ ⏱✓ step:open-page-2: #3 at 11.8s (exp 12.5s)
- ✓ failure:none: correctly absent
- ✓ claim:claims-reset: “the filter resets to all again” supported=no (exp no)
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: not_visible (exp not_visible)

### r3-not-visible.mov run 2
- ✓ ⏱✓ step:select-home: #2 at 6.8s (exp 6.5s)
- ✓ ⏱✓ step:open-page-2: #3 at 11.4s (exp 12.5s)
- ✓ failure:none: correctly absent
- ✓ claim:claims-reset: “the filter resets to all again” supported=no (exp no)
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: not_visible (exp not_visible)
