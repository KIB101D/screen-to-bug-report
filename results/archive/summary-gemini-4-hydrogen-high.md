# Eval: gemini-4-hydrogen, media HIGH

Rebuilt from 3 saved run file(s); 3 re-priced from stored token counts at current list prices. Timestamps count as correct within ±2 s.

| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r1-normal.mov | 1 | gemini-4-hydrogen | reproducible ✓ | 5/6 | 3/3 | 0 | 1 (+1 busy) | 131.6 s | $0.0314 |
| r2-silent-action.mov | 1 | gemini-4-hydrogen | reproducible ✓ | 6/8 | 4/4 | 0 | 1 | 47.1 s | $0.0262 |
| r3-not-visible.mov | 1 | gemini-4-hydrogen | not_visible ✓ | 7/7 | 2/2 | 0 | 1 | 43.1 s | $0.0263 |

Average: 73.9 s per recording; $0.0280 per recording at paid-tier list prices (retries included, hosting excluded).

## Details

### r1-normal.mov run 1
- ✓ ⏱✓ step:select-electronics: #1 at 7.0s (exp 6.0s)
- ✓ ⏱✓ step:open-page-2: #2 at 15.0s (exp 14.5s)
- ✓ ⏱✓ failure: 15.0s (exp 15.0s): Navigating to page 2 resets the Category filter from "Electronics" back to "All" and reverts the item total and pagination to all categories.
- ✗ claim:category-reset: not found
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)

### r2-silent-action.mov run 1
- ✓ ⏱✓ step:search-lamp: #1 at 4.5s (exp 5.5s)
- ✗ ⏱✓ step:select-electronics: #2 at 9.0s (exp 9.5s); narrated=false, expected true
- ✓ ⏱✓ step:open-page-2: #3 at 12.0s (exp 12.5s)
- ✓ ⏱✓ failure: 12.0s (exp 13.0s): Navigating to page 2 drops the selected Electronics category filter, resets the Category dropdown to All, and displays products from other categories.
- ✗ claim:category-dropped: not found
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: reproducible (exp reproducible)

### r3-not-visible.mov run 1
- ✓ ⏱✓ step:select-home: #1 at 7.0s (exp 6.5s)
- ✓ ⏱✓ step:open-page-2: #2 at 12.0s (exp 12.5s)
- ✓ failure:none: correctly absent
- ✓ claim:claims-reset: “The filter resets to All again after pressing page 2” supported=no (exp no)
- ✓ expectedBehavior: stated=false
- ✓ unknown:expected: listed
- ✓ verdict: not_visible (exp not_visible)
