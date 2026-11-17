/**
 * Rebuilds a summary table from saved run files, without calling the API.
 *
 *   npm run summary -- gemini-3.5-flash-lite high
 *   npm run summary -- gemini-4-hydrogen high --dir results/archive
 *
 * Reads <dir>/<recording>.<model>.<resolution>.run<N>.json and writes
 * <dir>/summary-<model>-<resolution>.md. Runs saved before a model had a price
 * in src/lib/config.ts are re-priced from their stored token counts.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AnalyzeMetrics } from "../src/lib/analyze";
import { priceAttempts } from "../src/lib/cost";
import type { Comparison, Expected } from "../src/lib/eval/compare";
import { renderSummary, type RunRow } from "../src/lib/eval/summary";
import type { Report } from "../src/lib/report/schema";

async function main() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf("--dir");
  const dir = dirIdx >= 0 ? args[dirIdx + 1] : "results";
  const [model, res] = args.filter((_, i) => dirIdx < 0 || (i !== dirIdx && i !== dirIdx + 1));
  if (!model || !res) throw new Error("usage: npm run summary -- <model> <resolution> [--dir results]");

  const expected = new Map<string, Expected>();
  for (const f of (await readdir("expected")).filter((f) => f.endsWith(".json"))) {
    const e = JSON.parse(await readFile(path.join("expected", f), "utf8")) as Expected;
    expected.set(path.parse(e.recording).name, e);
  }

  const pattern = new RegExp(`^(.+)\\.${model.replace(/\./g, "\\.")}\\.${res}\\.run(\\d+)\\.json$`);
  const rows: RunRow[] = [];
  let repriced = 0;
  for (const f of (await readdir(dir)).sort()) {
    const m = f.match(pattern);
    if (!m) continue;
    const exp = expected.get(m[1]);
    const saved = JSON.parse(await readFile(path.join(dir, f), "utf8")) as {
      report: Report;
      metrics: AnalyzeMetrics;
      comparison: Comparison;
    };
    const metrics = saved.metrics;
    if (!metrics.cost.priced) {
      const t = metrics.cost.tokens;
      const cost = priceAttempts(metrics.model, [
        {
          model: metrics.model,
          promptTokens: t.input + t.audio,
          inputByModality: { AUDIO: t.audio },
          outputTokens: t.output,
          thoughtsTokens: t.thoughts,
        },
      ]);
      if (cost.priced) {
        metrics.cost = cost;
        repriced++;
      }
    }
    rows.push({
      recording: exp?.recording ?? m[1],
      run: Number(m[2]),
      expectedVerdict: exp?.verdict ?? saved.report.verdict,
      report: saved.report,
      metrics,
      comparison: saved.comparison,
      ms: metrics.timings.totalMs,
    });
  }
  if (rows.length === 0) throw new Error(`no runs matching ${pattern} in ${dir}`);

  const note = `Rebuilt from ${rows.length} saved run file(s)${repriced ? `; ${repriced} re-priced from stored token counts at current list prices` : ""}.`;
  const out = path.join(dir, `summary-${model}-${res}.md`);
  await writeFile(out, renderSummary(`# Eval: ${model}, media ${res.toUpperCase()}`, note, rows));
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
