"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnalyzeEvent } from "@/lib/events";
import { captureFrames } from "@/lib/frames";
import { formatMs, formatTime, formatUsd } from "@/lib/format";
import { reportToMarkdown } from "@/lib/markdown";
import type { Report } from "@/lib/report/schema";

export type ClientTimings = { totalMs: number; blobUploadMs: number | null };
type Metrics = Extract<AnalyzeEvent, { type: "result" }>["metrics"];

const VERDICT: Record<Report["verdict"], { label: string; className: string; hint: string }> = {
  reproducible: {
    label: "Reproducible",
    className: "bg-emerald-100 text-emerald-900",
    hint: "The failure is visible in the recording.",
  },
  not_visible: {
    label: "Failure not visible",
    className: "bg-amber-100 text-amber-900",
    hint: "The speaker reports a failure, but the screen does not show it. No conclusion drawn.",
  },
  needs_clarification: {
    label: "Needs clarification",
    className: "bg-zinc-200 text-zinc-800",
    hint: "The recording is not enough to decide.",
  },
};

function SourceBadge({ source }: { source: "visible" | "claimed" | "both" }) {
  const map = {
    visible: ["On screen", "bg-sky-50 text-sky-800 ring-sky-200"],
    claimed: ["Speaker says", "bg-violet-50 text-violet-800 ring-violet-200"],
    both: ["On screen + said", "bg-teal-50 text-teal-800 ring-teal-200"],
  } as const;
  const [label, cls] = map[source];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>{label}</span>;
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${className}`}>{children}</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportView({
  report,
  metrics,
  timings,
  src,
  fileName,
}: {
  report: Report;
  metrics: Metrics;
  timings: ClientTimings | null;
  src: string;
  fileName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(0);
  const [frames, setFrames] = useState<Map<number, string>>(new Map());

  const times = useMemo(
    () => [...report.steps.map((s) => s.t), ...(report.observedFailure ? [report.observedFailure.t] : [])],
    [report],
  );

  useEffect(() => {
    let cancelled = false;
    captureFrames(src, times)
      .then((f) => !cancelled && setFrames(f))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [src, times]);

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = t;
    v.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  // The step whose moment was most recently passed is highlighted while the video plays.
  const activeStep = report.steps.reduce<number | null>((acc, s) => (s.t <= now + 0.25 ? s.n : acc), null);

  const verdict = VERDICT[report.verdict];
  const base = fileName.replace(/\.[^.]+$/, "");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <video
          ref={videoRef}
          src={src}
          controls
          className="w-full rounded-xl border border-zinc-200 bg-black"
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          onSeeked={(e) => setNow(e.currentTarget.currentTime)}
        />
        <Metrics metrics={metrics} timings={timings} />
      </div>

      <article className="space-y-6 rounded-xl border border-zinc-200 bg-white p-5">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verdict.className}`}>{verdict.label}</span>
            <span className="text-xs text-zinc-500">{verdict.hint}</span>
          </div>
          <h2 className="text-lg font-semibold">{report.title}</h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <SourceBadge source="visible" /> seen in the video
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <SourceBadge source="claimed" /> only said
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Not narrated</Badge> done silently
            </span>
            <span>Click a step or time to jump to its frame.</span>
          </p>
          {metrics.primaryModel && metrics.model !== metrics.primaryModel && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Answered by the fallback model {metrics.model} because {metrics.primaryModel} was overloaded. The fallback
              scored lower in evaluation, so double-check steps and the failure against the video.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
              onClick={() => download(`${base}.report.md`, reportToMarkdown(report, fileName), "text/markdown")}
            >
              Download .md
            </button>
            <button
              type="button"
              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
              onClick={() =>
                download(`${base}.report.json`, JSON.stringify({ report, metrics, timings }, null, 2), "application/json")
              }
            >
              Download .json
            </button>
          </div>
        </header>

        <Section title="Starting conditions">
          {report.startingConditions.length === 0 ? (
            <p className="text-sm text-zinc-500">Not established by the recording.</p>
          ) : (
            <ul className="space-y-1.5">
              {report.startingConditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Time onSeek={seek} t={c.t} />
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{c.fact}</span>
                    <SourceBadge source={c.source} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Steps to reproduce">
          <ol className="space-y-2">
            {report.steps.map((s) => (
              <li key={s.n}>
                <button
                  type="button"
                  onClick={() => seek(s.t)}
                  className={`flex w-full gap-3 rounded-lg border p-2 text-left transition ${
                    activeStep === s.n ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <Thumb src={frames.get(s.t)} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{s.n}.</span>
                      <span className="font-mono text-xs text-zinc-500">{formatTime(s.t)}</span>
                      <span>{s.action}</span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <SourceBadge source={s.source} />
                      {!s.narrated && <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Not narrated</Badge>}
                    </span>
                    {s.note && <span className="text-xs text-zinc-600">Note: {s.note}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Observed failure">
          {report.observedFailure && report.observedFailure.visible ? (
            <button
              type="button"
              onClick={() => seek(report.observedFailure!.t)}
              className="flex w-full gap-3 rounded-lg border border-rose-200 bg-rose-50/50 p-2 text-left hover:border-rose-400"
            >
              <Thumb src={frames.get(report.observedFailure.t)} />
              <span className="flex flex-col gap-1 text-sm">
                <span className="font-mono text-xs text-zinc-500">{formatTime(report.observedFailure.t)}</span>
                <span>{report.observedFailure.description}</span>
                <span className="font-mono text-xs text-zinc-600">Evidence: {report.observedFailure.evidence}</span>
                <span>
                  <SourceBadge source="visible" />
                </span>
              </span>
            </button>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              No failure is visible on screen.
              {report.observedFailure && ` Speaker describes: ${report.observedFailure.description}`}
            </p>
          )}
        </Section>

        <Section title="Speaker claims">
          {report.claims.length === 0 ? (
            <p className="text-sm text-zinc-500">No claims about the app’s behaviour.</p>
          ) : (
            <ul className="space-y-1.5">
              {report.claims.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Time onSeek={seek} t={c.t} />
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>“{c.text}”</span>
                  <Badge
                    className={
                      c.supportedByVideo === "yes"
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : c.supportedByVideo === "no"
                          ? "bg-rose-50 text-rose-800 ring-rose-200"
                          : "bg-zinc-50 text-zinc-700 ring-zinc-200"
                    }
                  >
                    {c.supportedByVideo === "yes"
                      ? "Supported by video"
                      : c.supportedByVideo === "no"
                        ? "Not supported by video"
                        : "Unclear"}
                  </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Expected behaviour">
          {report.expectedBehavior.stated ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {report.expectedBehavior.t != null && <Time onSeek={seek} t={report.expectedBehavior.t} />}
              <span>{report.expectedBehavior.text}</span>
              <SourceBadge source="claimed" />
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Not stated in the recording.</p>
          )}
        </Section>

        <Section title="Unknown">
          {report.unknowns.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing flagged.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {report.unknowns.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          )}
        </Section>
      </article>
    </div>
  );
}

function Time({ t, onSeek }: { t: number; onSeek: (t: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSeek(t)}
      className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 hover:bg-zinc-900 hover:text-white"
      title="Jump to this moment"
    >
      {formatTime(t)}
    </button>
  );
}

function Thumb({ src }: { src?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-[54px] w-[96px] shrink-0 rounded border border-zinc-200 object-cover object-top sm:h-[68px] sm:w-[120px]" />
  ) : (
    <span className="h-[54px] w-[96px] shrink-0 animate-pulse rounded bg-zinc-100 sm:h-[68px] sm:w-[120px]" />
  );
}

function Metrics({ metrics, timings }: { metrics: Metrics; timings: ClientTimings | null }) {
  const c = metrics.cost;
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
  return (
    <dl className="mt-4 space-y-1 rounded-xl border border-zinc-200 bg-white p-4 text-xs">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold">
          {timings ? formatMs(timings.totalMs) : "…"} to report · {c.priced ? formatUsd(c.totalUsd) : "unpriced model"}
        </span>
        <span className="text-zinc-500">{metrics.model}</span>
      </div>
      {timings?.blobUploadMs != null && row("Browser → Blob upload", formatMs(timings.blobUploadMs))}
      {metrics.blobDownloadMs > 0 && row("Server ← Blob download", formatMs(metrics.blobDownloadMs))}
      {metrics.uploadMode === "files" && row("Upload to Gemini Files API", formatMs(metrics.timings.geminiUploadMs))}
      {metrics.uploadMode === "files" && row("Gemini video processing", formatMs(metrics.timings.geminiProcessingMs))}
      {row(
        `Generation (${metrics.attempts} attempt${metrics.attempts === 1 ? "" : "s"}${metrics.transientErrors ? `, ${metrics.transientErrors} overload retries` : ""})`,
        formatMs(metrics.timings.generationMs),
      )}
      {row("Tokens in: video + text / audio", `${c.tokens.input.toLocaleString()} / ${c.tokens.audio.toLocaleString()}`)}
      {row("Tokens out: answer / thinking", `${c.tokens.output.toLocaleString()} / ${c.tokens.thoughts.toLocaleString()}`)}
      {c.priced &&
        row(
          "Cost: input / audio / output",
          `${formatUsd(c.inputUsd)} / ${formatUsd(c.audioUsd)} / ${formatUsd(c.outputUsd)}`,
        )}
      <p className="pt-2 text-[11px] text-zinc-400">
        Paid-tier list prices, retries included, hosting (Vercel, Blob) excluded. Sampled at {metrics.fps} fps.
      </p>
      {metrics.rejected.length > 0 && (
        <details className="pt-1 text-[11px] text-zinc-500">
          <summary className="cursor-pointer">Validator rejected {metrics.rejected.length} attempt(s)</summary>
          <ul className="list-disc pl-4">
            {metrics.rejected.flat().map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </dl>
  );
}
