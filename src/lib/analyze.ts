import {
  ApiError,
  FileState,
  GoogleGenAI,
  MediaResolution,
  ThinkingLevel,
  type Content,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { GEMINI, LIMITS } from "./config";
import { priceAttempts, readUsage, type AttemptUsage, type CostBreakdown } from "./cost";
import { SYSTEM_PROMPT, retryPrompt, userPrompt } from "./report/prompt";
import { ReportSchema, checkAgainstDuration, geminiReportSchema, type Report } from "./report/schema";

export type Stage = "uploading" | "processing" | "generating" | "busy" | "retrying";

export type AnalyzeInput = {
  data: Uint8Array;
  mimeType: string;
  durationSec?: number;
  displayName?: string;
  onStage?: (stage: Stage) => void;
};

export type AnalyzeMetrics = {
  model: string;
  /** The configured main model; differs from `model` when a fallback answered. */
  primaryModel: string;
  uploadMode: "files" | "inline";
  fps: number;
  mediaResolution: string;
  sizeBytes: number;
  timings: { geminiUploadMs: number; geminiProcessingMs: number; generationMs: number; totalMs: number };
  attempts: number;
  /** Calls that failed with 429/5xx and were retried or sent to a fallback model. */
  transientErrors: number;
  /** Validator messages for every rejected attempt; shows what the retry fixed. */
  rejected: string[][];
  cost: CostBreakdown;
};

export type AnalyzeResult = { report: Report; metrics: AnalyzeMetrics };

export class AnalyzeError extends Error {
  constructor(
    message: string,
    public metrics?: Partial<AnalyzeMetrics>,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TRANSIENT = new Set([429, 500, 503, 504]);
function isTransient(err: unknown) {
  if (err instanceof ApiError) return TRANSIENT.has(err.status);
  const msg = err instanceof Error ? err.message : String(err);
  return /"code":\s*(429|500|503|504)|UNAVAILABLE|RESOURCE_EXHAUSTED|timed? ?out|aborted/i.test(msg);
}

/**
 * generateContent with backoff on overload, then the fallback models in order.
 * Returns the model that actually answered, so cost is priced correctly.
 */
async function generateResilient(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model">,
  onBusy: () => void,
  onTransient: () => void,
): Promise<{ res: GenerateContentResponse; model: string }> {
  let last: unknown;
  for (const model of [GEMINI.model, ...GEMINI.fallbackModels]) {
    for (let i = 0; i <= GEMINI.transientRetries; i++) {
      try {
        return { res: await ai.models.generateContent({ ...params, model }), model };
      } catch (err) {
        if (!isTransient(err)) throw err;
        last = err;
        onTransient();
        if (i < GEMINI.transientRetries) {
          onBusy();
          await sleep(GEMINI.transientBackoffMs[i] ?? 20_000);
        }
      }
    }
  }
  throw last;
}

export function validateReportText(text: string, durationSec?: number): { report: Report } | { problems: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { problems: ["output is not valid JSON"] };
  }
  const parsed = ReportSchema.safeParse(json);
  if (!parsed.success) {
    return {
      problems: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  const late = checkAgainstDuration(parsed.data, durationSec, LIMITS.timestampSlackSec);
  return late.length ? { problems: late } : { report: parsed.data };
}

export async function analyzeVideo(input: AnalyzeInput): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AnalyzeError("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const started = performance.now();
  const timings = { geminiUploadMs: 0, geminiProcessingMs: 0, generationMs: 0, totalMs: 0 };
  const usages: AttemptUsage[] = [];
  const rejected: string[][] = [];
  let transientErrors = 0;
  const uploadMode = GEMINI.uploadMode === "inline" && input.data.byteLength <= GEMINI.inlineMaxBytes ? "inline" : "files";
  let uploadedName: string | undefined;

  const metrics = (): AnalyzeMetrics => ({
    model: usages.at(-1)?.model ?? GEMINI.model,
    primaryModel: GEMINI.model,
    uploadMode,
    fps: GEMINI.fps,
    mediaResolution: GEMINI.mediaResolution,
    sizeBytes: input.data.byteLength,
    timings: { ...timings, totalMs: Math.round(performance.now() - started) },
    attempts: usages.length,
    transientErrors,
    rejected,
    cost: priceAttempts(GEMINI.model, usages),
  });

  try {
    let videoPart: Part;
    if (uploadMode === "inline") {
      videoPart = {
        inlineData: { data: Buffer.from(input.data).toString("base64"), mimeType: input.mimeType },
        videoMetadata: { fps: GEMINI.fps },
      };
    } else {
      input.onStage?.("uploading");
      let t = performance.now();
      let file = await ai.files.upload({
        file: new Blob([new Uint8Array(input.data)], { type: input.mimeType }),
        config: { mimeType: input.mimeType, displayName: input.displayName ?? "recording" },
      });
      uploadedName = file.name;
      timings.geminiUploadMs = Math.round(performance.now() - t);

      input.onStage?.("processing");
      t = performance.now();
      while (file.state === FileState.PROCESSING || file.state === FileState.STATE_UNSPECIFIED) {
        if (performance.now() - t > LIMITS.fileActiveTimeoutMs) throw new AnalyzeError("Gemini did not finish processing the video in time", metrics());
        await sleep(1000);
        file = await ai.files.get({ name: file.name! });
      }
      timings.geminiProcessingMs = Math.round(performance.now() - t);
      if (file.state !== FileState.ACTIVE || !file.uri) {
        throw new AnalyzeError(`Gemini could not process the video (${file.state}: ${file.error?.message ?? "no details"})`, metrics());
      }
      videoPart = {
        fileData: { fileUri: file.uri, mimeType: file.mimeType ?? input.mimeType },
        videoMetadata: { fps: GEMINI.fps },
      };
    }

    const contents: Content[] = [{ role: "user", parts: [videoPart, { text: userPrompt(input.durationSec) }] }];

    for (let attempt = 0; attempt <= GEMINI.maxRetries; attempt++) {
      input.onStage?.(attempt === 0 ? "generating" : "retrying");
      const t = performance.now();
      const { res, model } = await generateResilient(
        ai,
        {
          contents,
          config: {
            httpOptions: { timeout: LIMITS.generationTimeoutMs },
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: geminiReportSchema,
            mediaResolution: MediaResolution[`MEDIA_RESOLUTION_${GEMINI.mediaResolution}`],
            ...(GEMINI.temperature != null ? { temperature: GEMINI.temperature } : {}),
            ...(GEMINI.thinkingLevel ? { thinkingConfig: { thinkingLevel: ThinkingLevel[GEMINI.thinkingLevel] } } : {}),
          },
        },
        () => input.onStage?.("busy"),
        () => transientErrors++,
      );
      timings.generationMs += Math.round(performance.now() - t);
      usages.push(readUsage(model, res.usageMetadata));

      const text = res.text ?? "";
      const checked = validateReportText(text, input.durationSec);
      if ("report" in checked) return { report: checked.report, metrics: metrics() };

      rejected.push(checked.problems);
      contents.push({ role: "model", parts: [{ text }] }, { role: "user", parts: [{ text: retryPrompt(checked.problems) }] });
    }

    throw new AnalyzeError("The model returned an invalid report twice; see rejected for details", metrics());
  } catch (err) {
    if (err instanceof AnalyzeError) throw err;
    throw new AnalyzeError(err instanceof Error ? err.message : String(err), metrics());
  } finally {
    if (uploadedName) await ai.files.delete({ name: uploadedName }).catch(() => undefined);
  }
}
