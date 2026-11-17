import type { GenerateContentResponseUsageMetadata } from "@google/genai";
import { PRICING } from "./config";

export type AttemptUsage = {
  model: string;
  promptTokens: number;
  inputByModality: Record<string, number>;
  outputTokens: number;
  thoughtsTokens: number;
};

export function readUsage(model: string, u: GenerateContentResponseUsageMetadata | undefined): AttemptUsage {
  const inputByModality: Record<string, number> = {};
  for (const d of u?.promptTokensDetails ?? []) {
    const key = String(d.modality ?? "UNKNOWN");
    inputByModality[key] = (inputByModality[key] ?? 0) + (d.tokenCount ?? 0);
  }
  return {
    model,
    promptTokens: u?.promptTokenCount ?? 0,
    inputByModality,
    outputTokens: u?.candidatesTokenCount ?? 0,
    thoughtsTokens: u?.thoughtsTokenCount ?? 0,
  };
}

export type CostBreakdown = {
  model: string;
  priced: boolean;
  inputUsd: number;
  audioUsd: number;
  outputUsd: number;
  totalUsd: number;
  tokens: { input: number; audio: number; output: number; thoughts: number };
};

/** Sums every attempt (retries included), each priced at its own model's paid-tier list price. */
export function priceAttempts(defaultModel: string, attempts: AttemptUsage[]): CostBreakdown {
  const perM = (n: number, price: number) => (n / 1_000_000) * price;
  const tokens = { input: 0, audio: 0, output: 0, thoughts: 0 };
  let inputUsd = 0;
  let audioUsd = 0;
  let outputUsd = 0;
  let priced = true;
  for (const a of attempts) {
    const p = PRICING[a.model];
    if (!p) priced = false;
    const audio = a.inputByModality.AUDIO ?? 0;
    const input = a.promptTokens - audio;
    tokens.audio += audio;
    tokens.input += input;
    tokens.output += a.outputTokens;
    tokens.thoughts += a.thoughtsTokens;
    if (p) {
      inputUsd += perM(input, p.input);
      audioUsd += perM(audio, p.audioInput);
      outputUsd += perM(a.outputTokens + a.thoughtsTokens, p.output);
    }
  }
  const models = [...new Set(attempts.map((a) => a.model))];
  return {
    model: models.length ? models.join(" + ") : defaultModel,
    priced: priced && (attempts.length === 0 ? Boolean(PRICING[defaultModel]) : true),
    inputUsd,
    audioUsd,
    outputUsd,
    totalUsd: inputUsd + audioUsd + outputUsd,
    tokens,
  };
}
