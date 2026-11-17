# Recording guide

Scripts for the three recordings. The `t` values in the JSON files are the planned moments; after recording, scrub the video and correct them **before the first analysis run**, then commit.

## Setup

- Chrome, window about 1280 px wide, page zoom 125 % so the summary line ("Category: … · Showing … of …") is readable. Hide the bookmarks bar.
- macOS: Cmd+Shift+5 → Record Selected Portion → Options → Microphone. Select the browser window only.
- Speak in English, calmly. **Pause about 2 seconds after every action**: Gemini samples the video at 1 frame per second.
- Start each recording on the page already loaded; the first 2–3 seconds should show the starting state without movement.
- Convert to MP4 and shrink (macOS records .mov):

```bash
ffmpeg -i in.mov -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k recordings/r1-normal.mp4
```

## R1 — normal (`/demo`)

| ~t | Do | Say |
| --- | --- | --- |
| 0 | Page loaded: All, page 1 | "This is the products page of the Acme store, no filter yet." |
| 5 | Category → Electronics | "I filter by Electronics." |
| 11 | Click page **2** | "Now I go to page two." |
| 12 | (list shows All, of 30) | "And the category is back to All, it shows every product again. It should stay on Electronics." |

## R2 — silent action + correction (`/demo`)

| ~t | Do | Say |
| --- | --- | --- |
| 0 | Page loaded | "Products page again." |
| 3–5 | Click search, type **lamp** | *(say nothing)* |
| 9 | Category → Electronics | "I choose Electronics." |
| 15 | Click page **2** | "Now page three… sorry, page two." |
| 16 | (Category: All, lamp kept, of 11) | "The category dropped again." |

Do not say what should happen in R2.

## R3 — failure not visible (`/demo?fixed=1`)

| ~t | Do | Say |
| --- | --- | --- |
| 0 | Page loaded | "Products page." |
| 4 | Category → Home | "I filter by Home." |
| 10 | Click page **2** | "Going to page two." |
| 11 | (still Home, of 7) | "And the filter reset to All again, same bug as before." |

Do not say what should happen in R3.
