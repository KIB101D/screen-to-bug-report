/**
 * Grabs still frames from a local video in the browser (no ffmpeg on the server).
 * Uses its own hidden <video> so the visible player is not disturbed.
 */
export async function captureFrames(src: string, times: number[], width = 320): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const unique = [...new Set(times)].sort((a, b) => a - b);
  if (unique.length === 0) return out;

  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.playsInline = true;
  video.src = src;

  await new Promise<void>((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("Could not load video for thumbnails")), { once: true });
  });

  const canvas = document.createElement("canvas");
  const scale = width / video.videoWidth;
  canvas.width = width;
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return out;

  for (const t of unique) {
    const target = Math.min(Math.max(t, 0), Math.max(video.duration - 0.05, 0));
    await new Promise<void>((resolve) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.currentTime = target;
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    out.set(t, canvas.toDataURL("image/jpeg", 0.75));
  }

  video.removeAttribute("src");
  video.load();
  return out;
}

/** Reads the duration from file metadata before uploading. */
export function readDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => reject(new Error("This file cannot be played in the browser"));
    v.src = src;
  });
}
