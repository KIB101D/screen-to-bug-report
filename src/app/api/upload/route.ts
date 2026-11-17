import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/config";

/**
 * Issues a short-lived client token so the browser uploads the recording straight
 * to Vercel Blob. Recordings are larger than Vercel's 4.5 MB request body limit,
 * so they cannot be posted to /api/analyze directly in production.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: LIMITS.acceptedMimeTypes,
        maximumSizeInBytes: LIMITS.maxSizeBytes,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
