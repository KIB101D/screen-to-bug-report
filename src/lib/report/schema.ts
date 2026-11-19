import { z } from "zod";
import { Type, type Schema } from "@google/genai";

/**
 * The bug report contract. Two views of the same shape:
 *  - `geminiReportSchema` constrains decoding on the model side (responseSchema);
 *  - `ReportSchema` (zod) is what the server trusts, plus cross-field rules the
 *    model schema cannot express. A failed parse triggers one retry.
 * Keep both in sync when adding a field.
 */

export const SOURCES = ["visible", "claimed", "both"] as const;
export const VERDICTS = ["reproducible", "not_visible", "needs_clarification"] as const;
export const SUPPORT = ["yes", "no", "unclear"] as const;

const seconds = z.number().min(0);

export const ReportSchema = z
  .object({
    title: z.string().min(1),
    startingConditions: z.array(
      z.object({ fact: z.string().min(1), source: z.enum(SOURCES), t: seconds }),
    ),
    steps: z.array(
      z.object({
        n: z.number().int().min(1),
        action: z.string().min(1),
        t: seconds,
        source: z.enum(SOURCES),
        narrated: z.boolean(),
        note: z.string().nullable(),
      }),
    ),
    observedFailure: z
      .object({ description: z.string().min(1), evidence: z.string().min(1), t: seconds, visible: z.boolean() })
      .nullable(),
    claims: z.array(z.object({ text: z.string().min(1), t: seconds, supportedByVideo: z.enum(SUPPORT) })),
    expectedBehavior: z.object({
      stated: z.boolean(),
      text: z.string().nullable(),
      t: seconds.nullable(),
    }),
    unknowns: z.array(z.string().min(1)),
    verdict: z.enum(VERDICTS),
  })
  .superRefine((r, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: "custom", message, path });

    r.steps.forEach((s, i) => {
      if (s.n !== i + 1) issue(`steps must be numbered 1..N in order (got ${s.n} at index ${i})`, ["steps", i, "n"]);
      if (i > 0 && s.t < r.steps[i - 1].t) issue("steps must be in chronological order", ["steps", i, "t"]);
      if (s.source === "claimed" && s.narrated === false)
        issue("a step known only from narration must have narrated=true", ["steps", i]);
    });

    if (r.verdict === "reproducible" && !(r.observedFailure && r.observedFailure.visible))
      issue('verdict "reproducible" requires a visible observedFailure', ["verdict"]);
    if (r.verdict === "not_visible" && r.observedFailure?.visible)
      issue('verdict "not_visible" contradicts a visible observedFailure', ["verdict"]);
    if (r.verdict === "not_visible" && !r.claims.some((c) => c.supportedByVideo !== "yes"))
      issue(
        'verdict "not_visible" needs a speaker claim that the video does not support; if the speaker claims no failure and none is visible, use "needs_clarification" and say in unknowns what is missing',
        ["verdict"],
      );

    if (r.expectedBehavior.stated && !r.expectedBehavior.text)
      issue("expectedBehavior.text is required when stated=true", ["expectedBehavior", "text"]);
    if (!r.expectedBehavior.stated && r.expectedBehavior.text)
      issue("expectedBehavior.text must be null when stated=false", ["expectedBehavior", "text"]);
  });

export type Report = z.infer<typeof ReportSchema>;

/** Extra checks that need the real video duration. */
export function checkAgainstDuration(r: Report, durationSec: number | undefined, slack: number) {
  if (!durationSec) return [];
  const limit = durationSec + slack;
  const out: string[] = [];
  const check = (t: number | null | undefined, where: string) => {
    if (t != null && t > limit) out.push(`${where}: t=${t}s is past the end of the video (${durationSec.toFixed(1)}s)`);
  };
  r.startingConditions.forEach((c, i) => check(c.t, `startingConditions[${i}]`));
  r.steps.forEach((s, i) => check(s.t, `steps[${i}]`));
  check(r.observedFailure?.t, "observedFailure");
  r.claims.forEach((c, i) => check(c.t, `claims[${i}]`));
  check(r.expectedBehavior.t, "expectedBehavior");
  return out;
}

const str = (description: string, nullable = false): Schema => ({ type: Type.STRING, description, nullable });
const num = (description: string, nullable = false): Schema => ({ type: Type.NUMBER, description, nullable });
const bool = (description: string): Schema => ({ type: Type.BOOLEAN, description });
const oneOf = (values: readonly string[], description: string): Schema => ({
  type: Type.STRING,
  enum: [...values],
  description,
});
const obj = (properties: Record<string, Schema>, nullable = false): Schema => ({
  type: Type.OBJECT,
  properties,
  required: Object.keys(properties),
  propertyOrdering: Object.keys(properties),
  nullable,
});
const arr = (items: Schema): Schema => ({ type: Type.ARRAY, items });

const T = "Seconds from the start of the video";

export const geminiReportSchema: Schema = obj({
  title: str("Short neutral bug title describing the visible symptom"),
  startingConditions: arr(
    obj({ fact: str("One starting condition"), source: oneOf(SOURCES, "Where it comes from"), t: num(T) }),
  ),
  steps: arr(
    obj({
      n: { type: Type.INTEGER, description: "1-based step number" },
      action: str('User action in present tense, e.g. "Selects category Electronics"'),
      t: num(`${T}, when the action takes effect on screen`),
      source: oneOf(SOURCES, "visible = seen on screen, claimed = only said, both = seen and said"),
      narrated: bool("Did the speaker mention this action?"),
      note: str("Discrepancy or correction between speech and screen, else null", true),
    }),
  ),
  observedFailure: obj(
    {
      description: str("What visibly goes wrong, no causes"),
      evidence: str("On-screen text or state quoted as displayed, before → after"),
      t: num(T),
      visible: bool("Seen on screen"),
    },
    true,
  ),
  claims: arr(
    obj({
      text: str("What the speaker claims about the app's behaviour"),
      t: num(T),
      supportedByVideo: oneOf(SUPPORT, "Does the screen support the claim?"),
    }),
  ),
  expectedBehavior: obj({
    stated: bool("Did the speaker say what should happen?"),
    text: str("What the speaker said should happen, else null", true),
    t: num(`${T}, else null`, true),
  }),
  unknowns: arr(str("Something a reproducer needs that the recording does not establish")),
  verdict: oneOf(VERDICTS, "reproducible | not_visible | needs_clarification"),
});
