import { del, get } from "@vercel/blob";
import { z } from "zod";
import { AnalyzeError, analyzeVideo } from "@/lib/analyze";
import { BLOB_ACCESS, LIMITS } from "@/lib/config";
import type { AnalyzeEvent } from "@/lib/events";

// Gemini file processing + generation for a 90 s video can take a minute or more.
export const maxDuration = 300;

const JsonBody = z.object({
  blobUrl: z.url(),
  mimeType: z.string(),
  durationSec: z.number().positive().max(LIMITS.maxDurationSec + 1).optional(),
  fileName: z.string().max(200).optional(),
});

type Source = {
  mimeType: string;
  durationSec?: number;
  fileName?: string;
  blobUrl?: string;
  load: () => Promise<Uint8Array>;
};

/**
 * Two ways in:
 *  - JSON { blobUrl, ... } after a client upload to Vercel Blob (production);
 *  - multipart form with `file` (local development without a Blob store,
 *    NEXT_PUBLIC_UPLOAD_MODE=direct). Vercel rejects bodies over 4.5 MB, so this
 *    path is for local use only.
 */
async function readSource(request: Request): Promise<Source> {
  const type = request.headers.get("content-type") ?? "";
  if (type.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    const duration = Number(form.get("durationSec"));
    return {
      mimeType: file.type || "video/mp4",
      durationSec: Number.isFinite(duration) && duration > 0 ? duration : undefined,
      fileName: file.name,
      load: async () => new Uint8Array(await file.arrayBuffer()),
    };
  }

  const body = JsonBody.parse(await request.json());
  const host = new URL(body.blobUrl).hostname;
  if (!host.endsWith(".blob.vercel-storage.com")) throw new Error("blobUrl must point to Vercel Blob storage");
  return {
    ...body,
    load: async () => {
      const blob = await get(body.blobUrl, { access: BLOB_ACCESS });
      if (!blob || blob.statusCode !== 200) throw new Error("Uploaded recording not found in Blob storage");
      return new Uint8Array(await new Response(blob.stream).arrayBuffer());
    },
  };
}

export async function POST(request: Request) {
  let source: Source;
  try {
    source = await readSource(request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Bad request" }, { status: 400 });
  }
  if (!LIMITS.acceptedMimeTypes.includes(source.mimeType)) {
    return Response.json({ error: `Unsupported type ${source.mimeType}` }, { status: 415 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalyzeEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        send({ type: "stage", stage: "downloading" });
        const t = performance.now();
        const data = await source.load();
        const blobDownloadMs = source.blobUrl ? Math.round(performance.now() - t) : 0;
        if (data.byteLength > LIMITS.maxSizeBytes) throw new AnalyzeError("Recording is larger than the size limit");

        const { report, metrics } = await analyzeVideo({
          data,
          mimeType: source.mimeType,
          durationSec: source.durationSec,
          displayName: source.fileName,
          onStage: (stage) => send({ type: "stage", stage }),
        });
        send({ type: "result", report, metrics: { ...metrics, blobDownloadMs } });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Analysis failed",
          metrics: error instanceof AnalyzeError ? error.metrics : undefined,
        });
      } finally {
        // The recording is not kept server-side once analysed.
        if (source.blobUrl) await del(source.blobUrl).catch(() => undefined);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
