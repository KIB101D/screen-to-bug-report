# Eval: gemini-3.5-flash-lite, 1 fps, media HIGH, upload=files

Run at 2026-11-17T22:29:20.644Z. Timestamps count as correct within ±2 s.

| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r4-next-button.mov | 1 | gemini-3.5-flash-lite | reproducible ✓ | 6/6 | 3/3 | 0 | 1 | 38.6 s | $0.0028 |

Average: 38.6 s and $0.0028 per recording (paid-tier list prices, retries included, hosting excluded).

## Details

### r4-next-button.mov run 1
- ✓ ⏱✓ step:select-home: #2 at 6.0s (exp 6.0s)
- ✓ ⏱✓ step:click-next: #3 at 8.0s (exp 8.5s)
- ✓ ⏱✓ failure: 9.0s (exp 9.0s): Category selection resets from Home to All and page changes when clicking pagination
- ✓ claim:jumped-back: “It jumped back to all categories, home should stay selected” supported=yes (exp yes)
- ✓ expectedBehavior: stated=true
- ✓ verdict: reproducible (exp reproducible)
