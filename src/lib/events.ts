import type { AnalyzeMetrics, Stage } from "./analyze";
import type { Report } from "./report/schema";

/** NDJSON events streamed by /api/analyze, one JSON object per line. */
export type AnalyzeEvent =
  | { type: "stage"; stage: "downloading" | Stage }
  | { type: "result"; report: Report; metrics: AnalyzeMetrics & { blobDownloadMs: number } }
  | { type: "error"; message: string; metrics?: Partial<AnalyzeMetrics> };
