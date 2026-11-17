# Eval: gemini-3.5-flash, 1 fps, media HIGH, upload=files

Run at 2026-11-17T21:34:53.227Z. Timestamps count as correct within ±2 s.

| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| r1-normal.mov | 1 | – | error | – | – | – | 0 | – | – |
| r2-silent-action.mov | 1 | – | error | – | – | – | 0 | – | – |
| r3-not-visible.mov | 1 | – | error | – | – | – | 0 | – | – |



## Details

### r1-normal.mov run 1
- error: {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}

### r2-silent-action.mov run 1
- error: {"error":{"code":504,"message":"Deadline expired before operation could complete.","status":"DEADLINE_EXCEEDED"}}

### r3-not-visible.mov run 1
- error: {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}
