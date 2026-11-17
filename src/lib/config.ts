/**
 * All tunable limits and assumptions in one place, so a live-session change
 * (another model, longer video, higher frame rate) is a config edit.
 */

export const LIMITS = {
  maxDurationSec: 90,
  maxSizeBytes: 100 * 1024 * 1024,
  acceptedMimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
  /** Timestamps may sit slightly past the reported duration because of frame sampling. */
  timestampSlackSec: 1.5,
  /** Waiting for the Gemini Files API to finish processing the upload. */
  fileActiveTimeoutMs: 120_000,
  /** One generateContent call; without it a stalled request hangs forever. */
  generationTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 180_000),
};

export const GEMINI = {
  // gemini-2.5-flash returns 404 for new API keys (checked 2026-11-17).
  model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  /** Gemini 3.x thinking level: MINIMAL | LOW | MEDIUM | HIGH. Unset = model default. */
  thinkingLevel: process.env.GEMINI_THINKING_LEVEL as "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | undefined,
  /** Frames per second sampled from the video. Gemini default is 1. */
  fps: Number(process.env.GEMINI_VIDEO_FPS ?? 1),
  /** "files" = Files API upload + wait for ACTIVE; "inline" = base64 in the request (small files only). */
  uploadMode: (process.env.GEMINI_UPLOAD_MODE ?? "files") as "files" | "inline",
  /** Inline requests are capped by the API; fall back to the Files API above this. */
  inlineMaxBytes: 15 * 1024 * 1024,
  /** Tried in order when the main model stays overloaded (503/429) after transientRetries. Comma-separated. */
  fallbackModels: (process.env.GEMINI_FALLBACK_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean),
  /** Retries of the same model on 429/500/503/504, with backoff. */
  transientRetries: 3,
  transientBackoffMs: [3_000, 8_000, 20_000],
  /** One extra attempt when the model returns JSON that fails validation. */
  maxRetries: 1,
  temperature: process.env.GEMINI_TEMPERATURE ? Number(process.env.GEMINI_TEMPERATURE) : undefined,
};

/**
 * Paid-tier list prices, USD per 1M tokens (standard tier, not batch).
 * Text, image and video input share one price; audio input is priced separately
 * where Google lists it; output price includes thinking tokens.
 * Free-tier usage is still costed at these prices: free credits are not zero operating cost.
 *
 * gemini-3.8-flash: $0.75 in / $3.75 out is a promotional rate through 2026-12-31;
 * from 2027-01-01 it doubles to $1.50 / $7.50. A separate audio rate was not found,
 * so audio is assumed to cost the same as other input. Re-check on
 * https://ai.google.dev/gemini-api/docs/pricing before reporting.
 * Other rows were copied from the same page during planning (2026-11-17).
 */
export const PRICING: Record<string, { input: number; audioInput: number; output: number }> = {
  "gemini-3.8-flash": { input: 0.75, audioInput: 0.75, output: 3.75 },
  "gemini-3-flash": { input: 0.5, audioInput: 0.5, output: 3.0 },
  "gemini-3.1-flash-lite": { input: 0.25, audioInput: 0.5, output: 1.5 },
  "gemini-2.5-flash": { input: 0.3, audioInput: 1.0, output: 2.5 },
  "gemini-3.5-flash": { input: 1.5, audioInput: 1.5, output: 9.0 },
};

export const BLOB_ACCESS = (process.env.BLOB_ACCESS ?? "public") as "public" | "private";
