import { formatTime } from "./format";
import type { Report } from "./report/schema";

const SOURCE: Record<string, string> = { visible: "on screen", claimed: "speaker says", both: "on screen + said" };

export function reportToMarkdown(r: Report, recordingName?: string) {
  const at = (t: number) => `\`${formatTime(t)}\``;
  const lines: string[] = [];
  lines.push(`# ${r.title}`, "");
  if (recordingName) lines.push(`Recording: ${recordingName}  `);
  lines.push(`Verdict: **${r.verdict}**`, "");

  lines.push("## Starting conditions");
  if (r.startingConditions.length === 0) lines.push("- Not established by the recording");
  r.startingConditions.forEach((c) => lines.push(`- ${c.fact} (${SOURCE[c.source]}, ${at(c.t)})`));

  lines.push("", "## Steps to reproduce");
  r.steps.forEach((s) => {
    const flags = [SOURCE[s.source], s.narrated ? null : "not narrated"].filter(Boolean).join(", ");
    lines.push(`${s.n}. ${at(s.t)} ${s.action} (${flags})${s.note ? `  \n   Note: ${s.note}` : ""}`);
  });

  lines.push("", "## Observed failure");
  lines.push(r.observedFailure ? `${at(r.observedFailure.t)} ${r.observedFailure.description}${r.observedFailure.visible ? "" : " (not visible on screen)"}` : "No failure is visible on screen.");

  lines.push("", "## Speaker claims");
  if (r.claims.length === 0) lines.push("- None");
  r.claims.forEach((c) => lines.push(`- ${at(c.t)} “${c.text}” (supported by video: ${c.supportedByVideo})`));

  lines.push("", "## Expected behaviour");
  lines.push(r.expectedBehavior.stated ? `${r.expectedBehavior.t != null ? at(r.expectedBehavior.t) + " " : ""}${r.expectedBehavior.text} (stated by speaker)` : "Not stated in the recording.");

  lines.push("", "## Unknown");
  if (r.unknowns.length === 0) lines.push("- Nothing flagged");
  r.unknowns.forEach((u) => lines.push(`- ${u}`));

  return lines.join("\n") + "\n";
}
