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

// Vercel caps a function response at 4.5 MB, so larger files fall back to a
// short-lived signed redirect. Everything else is relayed from this origin so
// an installed app never leaves its own window to show a file.
const RELAY_LIMIT_BYTES = 4 * 1024 * 1024;

const FILE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Disposition": "inline",
  "X-Content-Type-Options": "nosniff",
  // Lets the in-app viewer show PDFs in a frame; nothing else may embed them.
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
};

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

    const contentType = CONTENT_TYPES[path.extname(key).toLowerCase()];
    if (!contentType) throw new NotFoundError("File not found.");

    if (env.STORAGE_DRIVER === "cloudinary") {
      const signedUrl = signedCloudinaryUrl(key);
      const upstream = await fetch(signedUrl, { cache: "no-store" });

      if (!upstream.ok || !upstream.body) {
        console.error("[files] cloudinary fetch failed", upstream.status, key);
        throw new NotFoundError("File not found.");
      }

      const length = Number(upstream.headers.get("content-length") ?? 0);
      if (length > RELAY_LIMIT_BYTES) {
        await upstream.body.cancel();
        return new Response(null, {
          status: 302,
          headers: {
            Location: signedUrl,
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      }

      return new Response(upstream.body, {
        headers: {
          ...FILE_HEADERS,
          "Content-Type": contentType,
          ...(length ? { "Content-Length": String(length) } : {}),
        },
      });
    }

    const filePath = resolveLocalFile(segments);
    if (!filePath) throw new NotFoundError("File not found.");

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
        ...FILE_HEADERS,
        "Content-Type": contentType,
        "Content-Length": String(size),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
