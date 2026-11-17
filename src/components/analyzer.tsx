"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { AnalyzeEvent } from "@/lib/events";
import { readDuration } from "@/lib/frames";
import { formatMs } from "@/lib/format";
import { ReportView, type ClientTimings } from "./report-view";

const LIMIT_SEC = 90;
const LIMIT_BYTES = 100 * 1024 * 1024;
const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];
const UPLOAD_MODE = process.env.NEXT_PUBLIC_UPLOAD_MODE === "direct" ? "direct" : "blob";
const BLOB_ACCESS = process.env.NEXT_PUBLIC_BLOB_ACCESS === "private" ? "private" : "public";

type StageKey = "client-upload" | Extract<AnalyzeEvent, { type: "stage" }>["stage"];

const STAGE_LABEL: Record<StageKey, string> = {
  "client-upload": "Uploading recording",
  downloading: "Server is fetching the recording",
  uploading: "Sending video to Gemini",
  processing: "Gemini is processing the video",
  generating: "Generating the report",
  retrying: "Output failed validation, retrying once",
};

type Result = Extract<AnalyzeEvent, { type: "result" }>;
type Picked = { file: File; src: string; duration: number };

export function Analyzer() {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<{ key: StageKey; at: number }[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timings, setTimings] = useState<ClientTimings | null>(null);
  const startedAt = useRef(0);
  const blobUploadMs = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.src);
  }, [picked]);

  // "Time to a useful result" is measured until the report has rendered.
  useEffect(() => {
    if (!result) return;
    const id = requestAnimationFrame(() =>
      setTimings({ totalMs: performance.now() - startedAt.current, blobUploadMs: blobUploadMs.current }),
    );
    return () => cancelAnimationFrame(id);
  }, [result]);

  const reset = () => {
    setResult(null);
    setError(null);
    setStages([]);
    setProgress(null);
    setTimings(null);
  };

  const pick = useCallback(async (file: File | undefined) => {
    reset();
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError(`Unsupported file type ${file.type || "(unknown)"}. Use MP4, MOV or WebM.`);
    if (file.size > LIMIT_BYTES) return setError("The file is larger than 100 MB.");
    const src = URL.createObjectURL(file);
    try {
      const duration = await readDuration(src);
      if (duration > LIMIT_SEC + 0.5) {
        URL.revokeObjectURL(src);
        return setError(`The recording is ${duration.toFixed(0)} s long; the limit is ${LIMIT_SEC} s.`);
      }
      setPicked({ file, src, duration });
    } catch (e) {
      URL.revokeObjectURL(src);
      setError(e instanceof Error ? e.message : "Cannot read this video");
    }
  }, []);

  const run = async () => {
    if (!picked) return;
    reset();
    setRunning(true);
    startedAt.current = performance.now();
    blobUploadMs.current = null;
    const mark = (key: StageKey) => setStages((s) => [...s, { key, at: performance.now() - startedAt.current }]);

    try {
      const { file, duration } = picked;
      let res: Response;
      mark("client-upload");
      if (UPLOAD_MODE === "direct") {
        const form = new FormData();
        form.set("file", file);
        form.set("durationSec", String(duration));
        res = await fetch("/api/analyze", { method: "POST", body: form });
      } else {
        const safeName = file.name.replace(/[^\w.-]+/g, "_");
        const blob = await upload(`recordings/${safeName}`, file, {
          access: BLOB_ACCESS,
          handleUploadUrl: "/api/upload",
          contentType: file.type,
          multipart: file.size > 8 * 1024 * 1024,
          onUploadProgress: (p) => setProgress(p.percentage),
        });
        blobUploadMs.current = performance.now() - startedAt.current;
        res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, mimeType: file.type, durationSec: duration, fileName: file.name }),
        });
      }

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const event = JSON.parse(line) as AnalyzeEvent;
          if (event.type === "stage") mark(event.stage);
          else if (event.type === "result") {
            setResult(event);
            finished = true;
          } else {
            throw new Error(event.message);
          }
        }
      }
      if (!finished) throw new Error("The server closed the connection before the report was ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={running}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
          >
            {picked ? "Choose another recording" : "Choose a screen recording"}
          </button>
          {picked && (
            <span className="text-sm text-zinc-600">
              {picked.file.name} · {picked.duration.toFixed(1)} s · {(picked.file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
          <button
            type="button"
            disabled={!picked || running}
            onClick={run}
            className="ml-auto rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            {running ? "Analysing…" : "Build bug report"}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          One browser workflow, up to {LIMIT_SEC} s, one speaker (narration optional). MP4, MOV or WebM.
        </p>

        {stages.length > 0 && (
          <ol className="mt-4 space-y-1 text-sm">
            {stages.map((s, i) => {
              const last = i === stages.length - 1 && running;
              return (
                <li key={`${s.key}-${i}`} className="flex items-center gap-2">
                  <span className={last ? "animate-pulse text-zinc-900" : "text-emerald-600"}>{last ? "●" : "✓"}</span>
                  <span className={last ? "text-zinc-900" : "text-zinc-500"}>
                    {STAGE_LABEL[s.key]}
                    {s.key === "client-upload" && progress != null && last ? ` ${Math.round(progress)}%` : ""}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-400">+{formatMs(s.at)}</span>
                </li>
              );
            })}
          </ol>
        )}

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      </section>

      {result && picked && (
        <ReportView
          report={result.report}
          metrics={result.metrics}
          timings={timings}
          src={picked.src}
          fileName={picked.file.name}
        />
      )}
    </div>
  );
}
