import type { GenerateContentResponseUsageMetadata } from "@google/genai";
import { PRICING } from "./config";

export type AttemptUsage = {
  promptTokens: number;
  inputByModality: Record<string, number>;
  outputTokens: number;
  thoughtsTokens: number;
};

export function readUsage(u: GenerateContentResponseUsageMetadata | undefined): AttemptUsage {
  const inputByModality: Record<string, number> = {};
  for (const d of u?.promptTokensDetails ?? []) {
    const key = String(d.modality ?? "UNKNOWN");
    inputByModality[key] = (inputByModality[key] ?? 0) + (d.tokenCount ?? 0);
  }
  return {
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

/** Sums every attempt (retries included) and prices it at paid-tier list prices. */
export function priceAttempts(model: string, attempts: AttemptUsage[]): CostBreakdown {
  const p = PRICING[model];
  let audio = 0;
  let input = 0;
  let output = 0;
  let thoughts = 0;
  for (const a of attempts) {
    const a_audio = a.inputByModality.AUDIO ?? 0;
    audio += a_audio;
    input += a.promptTokens - a_audio;
    output += a.outputTokens;
    thoughts += a.thoughtsTokens;
  }
  const perM = (n: number, price: number) => (n / 1_000_000) * price;
  const inputUsd = p ? perM(input, p.input) : 0;
  const audioUsd = p ? perM(audio, p.audioInput) : 0;
  const outputUsd = p ? perM(output + thoughts, p.output) : 0;
  return {
    model,
    priced: Boolean(p),
    inputUsd,
    audioUsd,
    outputUsd,
    totalUsd: inputUsd + audioUsd + outputUsd,
    tokens: { input, audio, output, thoughts },
  };
}
