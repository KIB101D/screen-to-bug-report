import type { Report } from "../report/schema";

/**
 * Expected facts for one recording, written before the first analysis run.
 * `match` entries are keyword groups: every group must appear in the text,
 * and "a|b" inside a group means either word is fine. Case-insensitive.
 */
export type Expected = {
  recording: string;
  scenario: string;
  verdict: Report["verdict"];
  steps: { id: string; t: number; match: string[]; narrated: boolean; noteRequired?: boolean }[];
  /** null = no failure may be reported as visible. */
  failure: { t: number; match: string[] } | null;
  claims: { id: string; match: string[]; supportedByVideo: "yes" | "no" | "unclear" }[];
  expectedBehaviorStated: boolean;
  /** Each entry is a keyword group that some unknowns[] line must contain. */
  unknownsMustMention: string[][];
  /** Words that signal invented causes or technical detail. */
  forbidden: string[];
};

export type Check = { fact: string; ok: boolean; detail: string; timed?: boolean; timeOk?: boolean };

export type Comparison = {
  checks: Check[];
  factsHit: number;
  factsTotal: number;
  timedHit: number;
  timedTotal: number;
  fabrications: string[];
  extraSteps: number;
};

const TOLERANCE_SEC = 2;

export function matches(text: string, groups: string[]) {
  const t = text.toLowerCase();
  return groups.every((g) => g.split("|").some((alt) => t.includes(alt.trim().toLowerCase())));
}

const fmt = (t: number) => `${t.toFixed(1)}s`;

export function compare(report: Report, exp: Expected): Comparison {
  const checks: Check[] = [];
  const fabrications: string[] = [];

  // Steps: match in order, each report step used at most once.
  let cursor = 0;
  for (const s of exp.steps) {
    const idx = report.steps.findIndex((r, i) => i >= cursor && matches(r.action, s.match));
    if (idx < 0) {
      checks.push({ fact: `step:${s.id}`, ok: false, detail: "not found", timed: true, timeOk: false });
      continue;
    }
    cursor = idx + 1;
    const r = report.steps[idx];
    const timeOk = Math.abs(r.t - s.t) <= TOLERANCE_SEC;
    const narratedOk = r.narrated === s.narrated;
    const noteOk = !s.noteRequired || Boolean(r.note);
    checks.push({
      fact: `step:${s.id}`,
      ok: narratedOk && noteOk,
      timed: true,
      timeOk,
      detail: [
        `#${r.n} at ${fmt(r.t)} (exp ${fmt(s.t)})`,
        narratedOk ? null : `narrated=${r.narrated}, expected ${s.narrated}`,
        noteOk ? null : "missing correction note",
      ]
        .filter(Boolean)
        .join("; "),
    });
  }

  // Failure.
  const f = report.observedFailure;
  if (exp.failure) {
    const found = Boolean(f && f.visible && matches(f.description, exp.failure.match));
    const timeOk = Boolean(f && Math.abs(f.t - exp.failure.t) <= TOLERANCE_SEC);
    checks.push({
      fact: "failure",
      ok: found,
      timed: true,
      timeOk: found && timeOk,
      detail: f ? `${fmt(f.t)} (exp ${fmt(exp.failure.t)}): ${f.description}` : "missing",
    });
  } else {
    const invented = Boolean(f && f.visible);
    checks.push({ fact: "failure:none", ok: !invented, detail: invented ? `invented: ${f!.description}` : "correctly absent" });
    if (invented) fabrications.push(`visible failure invented: ${f!.description}`);
  }

  // Claims.
  for (const c of exp.claims) {
    const r = report.claims.find((x) => matches(x.text, c.match));
    checks.push({
      fact: `claim:${c.id}`,
      ok: Boolean(r && r.supportedByVideo === c.supportedByVideo),
      detail: r ? `“${r.text}” supported=${r.supportedByVideo} (exp ${c.supportedByVideo})` : "not found",
    });
  }

  // Expected behaviour.
  const ebOk = report.expectedBehavior.stated === exp.expectedBehaviorStated;
  checks.push({ fact: "expectedBehavior", ok: ebOk, detail: `stated=${report.expectedBehavior.stated}` });
  if (!exp.expectedBehaviorStated && report.expectedBehavior.stated) {
    fabrications.push(`expected behaviour invented: ${report.expectedBehavior.text}`);
  }

  for (const groups of exp.unknownsMustMention) {
    const ok = report.unknowns.some((u) => matches(u, groups));
    checks.push({ fact: `unknown:${groups.join("+")}`, ok, detail: ok ? "listed" : "missing from unknowns" });
  }

  checks.push({ fact: "verdict", ok: report.verdict === exp.verdict, detail: `${report.verdict} (exp ${exp.verdict})` });

  // Invented technical detail anywhere in the report text.
  const allText = JSON.stringify(report).toLowerCase();
  for (const word of exp.forbidden) {
    if (allText.includes(word.toLowerCase())) fabrications.push(`forbidden term: "${word}"`);
  }

  const timed = checks.filter((c) => c.timed);
  return {
    checks,
    factsHit: checks.filter((c) => c.ok).length,
    factsTotal: checks.length,
    timedHit: timed.filter((c) => c.timeOk).length,
    timedTotal: timed.length,
    fabrications,
    extraSteps: report.steps.length - exp.steps.filter((s) => checks.find((c) => c.fact === `step:${s.id}`)?.detail !== "not found").length,
  };
}
