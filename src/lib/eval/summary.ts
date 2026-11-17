import type { AnalyzeMetrics } from "../analyze";
import type { Report } from "../report/schema";
import type { Comparison } from "./compare";

export type RunRow =
  | {
      recording: string;
      run: number;
      expectedVerdict: Report["verdict"];
      report: Report;
      metrics: AnalyzeMetrics;
      comparison: Comparison;
      ms: number;
    }
  | { recording: string; run: number; error: string; attempts?: number };

const usd = (m: AnalyzeMetrics) => (m.cost.priced ? `$${m.cost.totalUsd.toFixed(4)}` : "unpriced");

/** Markdown summary shared by `npm run eval` (fresh runs) and `npm run summary` (saved runs). */
export function renderSummary(title: string, note: string, rows: RunRow[]) {
  const ok = rows.filter((r): r is Extract<RunRow, { report: Report }> => "report" in r);
  const priced = ok.filter((r) => r.metrics.cost.priced);

  const table = rows.map((r) => {
    if (!("report" in r)) return `| ${r.recording} | ${r.run} | – | error | – | – | – | ${r.attempts ?? "–"} | – | – |`;
    const { report, metrics: m, comparison: c } = r;
    return `| ${r.recording} | ${r.run} | ${m.model} | ${report.verdict} ${report.verdict === r.expectedVerdict ? "✓" : "✗"} | ${c.factsHit}/${c.factsTotal} | ${c.timedHit}/${c.timedTotal} | ${c.fabrications.length} | ${m.attempts}${m.transientErrors ? ` (+${m.transientErrors} busy)` : ""} | ${(r.ms / 1000).toFixed(1)} s | ${usd(m)} |`;
  });

  const detail = rows.flatMap((r) =>
    "report" in r
      ? [
          `### ${r.recording} run ${r.run}`,
          ...r.comparison.checks.map((c) => `- ${c.ok ? "✓" : "✗"}${c.timed ? (c.timeOk ? " ⏱✓" : " ⏱✗") : ""} ${c.fact}: ${c.detail}`),
          ...r.comparison.fabrications.map((f) => `- ⚠ fabrication: ${f}`),
          ...(r.metrics.rejected?.length ? [`- retry fixed: ${r.metrics.rejected.flat().join("; ")}`] : []),
          "",
        ]
      : [`### ${r.recording} run ${r.run}`, `- error: ${r.error}`, ""],
  );

  const avgMs = ok.length ? ok.reduce((s, r) => s + r.ms, 0) / ok.length : 0;
  const avgUsd = priced.length ? priced.reduce((s, r) => s + r.metrics.cost.totalUsd, 0) / priced.length : 0;
  const average = ok.length
    ? `Average: ${(avgMs / 1000).toFixed(1)} s per recording; ${
        priced.length ? `$${avgUsd.toFixed(4)} per recording at paid-tier list prices (retries included, hosting excluded)` : "no list price for this model"
      }${priced.length && priced.length < ok.length ? `, ${ok.length - priced.length} unpriced run(s) excluded` : ""}.`
    : "";

  return [
    title,
    "",
    `${note} Timestamps count as correct within ±2 s.`,
    "",
    "| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...table,
    "",
    average,
    "",
    "## Details",
    "",
    ...detail,
  ].join("\n");
}
