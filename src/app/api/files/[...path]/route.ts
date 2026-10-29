import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { env } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { canReadFile } from "@/lib/services/file-access";
import {
  isValidFileKey,
  resolveLocalFile,
  signedCloudinaryUrl,
} from "@/lib/storage";

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
    const user = await requireApiUser();

    const { path: segments } = await context.params;
    const key = segments.join("/");

    // A file the viewer may not read looks exactly like one that does not exist.
    if (!isValidFileKey(key) || !(await canReadFile(user, key))) {
      throw new NotFoundError("File not found.");
    }

    if (env.STORAGE_DRIVER === "cloudinary") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: signedCloudinaryUrl(key),
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }

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
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
