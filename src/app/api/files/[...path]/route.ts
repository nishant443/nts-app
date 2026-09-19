import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { NotFoundError } from "@/lib/errors";
import { resolveLocalFile } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  context: RouteContext<"/api/files/[...path]">,
) {
  try {
    await requireApiUser();

    const { path: segments } = await context.params;
    const filePath = resolveLocalFile(segments);

    if (!filePath) throw new NotFoundError("File not found.");

    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) throw new NotFoundError("File not found.");

    let size: number;
    try {
      const info = await stat(filePath);
      if (!info.isFile()) throw new Error("not a file");
      size = info.size;
    } catch {
      throw new NotFoundError("File not found.");
    }

    const stream = Readable.toWeb(
      createReadStream(filePath),
    ) as WebReadableStream<Uint8Array>;

    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
