# Test recordings

| Recording | Scenario | Length |
| --- | --- | --- |
| `r1-normal` | Normal: narrated lead-up and failure | 20.1 s |
| `r2-silent-action` | Unnarrated search and a spoken correction | 14.4 s |
| `r3-not-visible` | Speaker claims a failure the fixed page does not show | 15.6 s |
| `r4-next-button` | New input recorded after tuning | 15.8 s |

Each recording is here twice:

- `.mov`: the original macOS screen recording (H.264 video, AAC audio). The eval and `expected/*.json` use these files.
- `.mp4`: the same recording in an MP4 container, made without re-encoding:

  ```bash
  ffmpeg -i r1-normal.mov -map 0 -c copy -movflags +faststart r1-normal.mp4
  ```

  Only the container differs: the video and audio streams are byte-identical (checked with `ffmpeg -i <file> -map 0 -c copy -f md5 -`, same hash for both files). Duration and codecs match.

Both formats can be uploaded to the app. Scenario scripts and expected facts: `../expected/RECORDING-GUIDE.md` and `../expected/*.json`.
