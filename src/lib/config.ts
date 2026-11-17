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
};

export const GEMINI = {
  model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  /** Frames per second sampled from the video. Gemini default is 1. */
  fps: Number(process.env.GEMINI_VIDEO_FPS ?? 1),
  /** "files" = Files API upload + wait for ACTIVE; "inline" = base64 in the request (small files only). */
  uploadMode: (process.env.GEMINI_UPLOAD_MODE ?? "files") as "files" | "inline",
  /** Inline requests are capped by the API; fall back to the Files API above this. */
  inlineMaxBytes: 15 * 1024 * 1024,
  /** One extra attempt when the model returns JSON that fails validation. */
  maxRetries: 1,
  temperature: process.env.GEMINI_TEMPERATURE ? Number(process.env.GEMINI_TEMPERATURE) : undefined,
};

/**
 * Paid-tier list prices, USD per 1M tokens.
 * Source: https://ai.google.dev/gemini-api/docs/pricing (values copied 2026-11-17, re-check before reporting).
 * Text, image and video input share one price; audio input is priced separately;
 * output price includes thinking tokens.
 * Free-tier usage is still costed at these prices: free credits are not zero operating cost.
 */
export const PRICING: Record<string, { input: number; audioInput: number; output: number }> = {
  "gemini-3.1-flash-lite": { input: 0.25, audioInput: 0.5, output: 1.5 },
  "gemini-2.5-flash": { input: 0.3, audioInput: 1.0, output: 2.5 },
  "gemini-3.5-flash": { input: 1.5, audioInput: 1.5, output: 9.0 },
};

export const BLOB_ACCESS = (process.env.BLOB_ACCESS ?? "public") as "public" | "private";
