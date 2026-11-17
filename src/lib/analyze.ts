import { FileState, GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
import { GEMINI, LIMITS } from "./config";
import { priceAttempts, readUsage, type AttemptUsage, type CostBreakdown } from "./cost";
import { SYSTEM_PROMPT, retryPrompt, userPrompt } from "./report/prompt";
import { ReportSchema, checkAgainstDuration, geminiReportSchema, type Report } from "./report/schema";

export type Stage = "uploading" | "processing" | "generating" | "retrying";

export type AnalyzeInput = {
  data: Uint8Array;
  mimeType: string;
  durationSec?: number;
  displayName?: string;
  onStage?: (stage: Stage) => void;
};

export type AnalyzeMetrics = {
  model: string;
  uploadMode: "files" | "inline";
  fps: number;
  sizeBytes: number;
  timings: { geminiUploadMs: number; geminiProcessingMs: number; generationMs: number; totalMs: number };
  attempts: number;
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
  const uploadMode = GEMINI.uploadMode === "inline" && input.data.byteLength <= GEMINI.inlineMaxBytes ? "inline" : "files";
  let uploadedName: string | undefined;

  const metrics = (): AnalyzeMetrics => ({
    model: GEMINI.model,
    uploadMode,
    fps: GEMINI.fps,
    sizeBytes: input.data.byteLength,
    timings: { ...timings, totalMs: Math.round(performance.now() - started) },
    attempts: usages.length,
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
      const res = await ai.models.generateContent({
        model: GEMINI.model,
        contents,
        config: {
          httpOptions: { timeout: LIMITS.generationTimeoutMs },
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: geminiReportSchema,
          ...(GEMINI.temperature != null ? { temperature: GEMINI.temperature } : {}),
          ...(GEMINI.thinkingLevel ? { thinkingConfig: { thinkingLevel: ThinkingLevel[GEMINI.thinkingLevel] } } : {}),
        },
      });
      timings.generationMs += Math.round(performance.now() - t);
      usages.push(readUsage(res.usageMetadata));

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
