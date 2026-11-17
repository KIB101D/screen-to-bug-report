/**
 * Runs every recording in expected/*.json through the real pipeline (no cached
 * answers), compares the report with the expected facts and prints a table.
 *
 *   npm run eval                      # all recordings, 1 run each
 *   npm run eval -- --runs 2          # stability check
 *   npm run eval -- expected/r2.json  # one recording
 *   GEMINI_MODEL=gemini-3.5-flash npm run eval
 *
 * Results: results/<recording>.<model>.run<N>.json and results/summary-<model>.md
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeVideo, AnalyzeError } from "../src/lib/analyze";
import { GEMINI } from "../src/lib/config";
import { compare, type Expected } from "../src/lib/eval/compare";
import { mp4Duration } from "./mp4-duration";

const MIME: Record<string, string> = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };

async function main() {
  const args = process.argv.slice(2);
  const runsIdx = args.indexOf("--runs");
  const runs = runsIdx >= 0 ? Number(args[runsIdx + 1]) : 1;
  const files = args.filter((a, i) => a.endsWith(".json") && i !== runsIdx + 1);
  const expectedFiles = files.length
    ? files
    : (await readdir("expected")).filter((f) => f.endsWith(".json")).sort().map((f) => path.join("expected", f));

  await mkdir("results", { recursive: true });
  const rows: string[] = [];
  const detail: string[] = [];
  let totalCost = 0;
  let totalMs = 0;
  let n = 0;

  for (const file of expectedFiles) {
    const exp = JSON.parse(await readFile(file, "utf8")) as Expected;
    const videoPath = path.join("recordings", exp.recording);
    const data = new Uint8Array(await readFile(videoPath));
    const mimeType = MIME[path.extname(videoPath).toLowerCase()] ?? "video/mp4";
    const durationSec = mp4Duration(data);

    for (let run = 1; run <= runs; run++) {
      process.stdout.write(`${exp.recording} run ${run}/${runs} … `);
      const started = performance.now();
      try {
        const { report, metrics } = await analyzeVideo({
          data,
          mimeType,
          durationSec,
          displayName: exp.recording,
          onStage: (stage) => process.stdout.write(`${stage} (+${((performance.now() - started) / 1000).toFixed(0)} s) … `),
        });
        const wallMs = performance.now() - started;
        const cmp = compare(report, exp);
        const base = `${path.parse(exp.recording).name}.${metrics.model.replace(/ \+ /g, "+")}.run${run}`;
        await writeFile(path.join("results", `${base}.json`), JSON.stringify({ report, metrics, comparison: cmp }, null, 2));

        totalCost += metrics.cost.totalUsd;
        totalMs += wallMs;
        n++;
        rows.push(
          `| ${exp.recording} | ${run} | ${metrics.model} | ${report.verdict} ${report.verdict === exp.verdict ? "✓" : "✗"} | ${cmp.factsHit}/${cmp.factsTotal} | ${cmp.timedHit}/${cmp.timedTotal} | ${cmp.fabrications.length} | ${metrics.attempts}${metrics.transientErrors ? ` (+${metrics.transientErrors} busy)` : ""} | ${(wallMs / 1000).toFixed(1)} s | $${metrics.cost.totalUsd.toFixed(4)} |`,
        );
        detail.push(
          `### ${exp.recording} run ${run}`,
          ...cmp.checks.map((c) => `- ${c.ok ? "✓" : "✗"}${c.timed ? (c.timeOk ? " ⏱✓" : " ⏱✗") : ""} ${c.fact}: ${c.detail}`),
          ...cmp.fabrications.map((f) => `- ⚠ fabrication: ${f}`),
          ...(metrics.rejected.length ? [`- retry fixed: ${metrics.rejected.flat().join("; ")}`] : []),
          "",
        );
        console.log(`${cmp.factsHit}/${cmp.factsTotal} facts, ${(wallMs / 1000).toFixed(1)} s, $${metrics.cost.totalUsd.toFixed(4)}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        rows.push(`| ${exp.recording} | ${run} | – | error | – | – | – | ${e instanceof AnalyzeError ? (e.metrics?.attempts ?? "–") : "–"} | – | – |`);
        detail.push(`### ${exp.recording} run ${run}`, `- error: ${msg}`, "");
        console.log(`error: ${msg}`);
      }
    }
  }

  const summary = [
    `# Eval: ${GEMINI.model}${GEMINI.fallbackModels.length ? ` (fallback ${GEMINI.fallbackModels.join(", ")})` : ""}, ${GEMINI.fps} fps, upload=${GEMINI.uploadMode}`,
    "",
    `Run at ${new Date().toISOString()}. Timestamps count as correct within ±2 s.`,
    "",
    "| Recording | Run | Answered by | Verdict | Facts | Timestamps ±2 s | Fabrications | Attempts | Time | Cost |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    n ? `Average: ${(totalMs / n / 1000).toFixed(1)} s and $${(totalCost / n).toFixed(4)} per recording (paid-tier list prices, retries included, hosting excluded).` : "",
    "",
    "## Details",
    "",
    ...detail,
  ].join("\n");

  await writeFile(path.join("results", `summary-${GEMINI.model}.md`), summary);
  console.log("\n" + summary.split("## Details")[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
