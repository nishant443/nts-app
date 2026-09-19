import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import { AppError, ValidationError } from "@/lib/errors";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
} as const;

type AllowedMime = keyof typeof ALLOWED;

export interface StoredFile {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

function sniffMime(bytes: Uint8Array): AllowedMime | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => bytes[index] === byte)) return "image/png";

  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  if (
    riff.every((byte, index) => bytes[index] === byte) &&
    webp.every((byte, index) => bytes[index + 8] === byte)
  ) {
    return "image/webp";
  }

  return null;
}

export function safeFileName(original: string): string {
  const base = path.basename(original).replace(/\\/g, "/").split("/").pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  return cleaned || "file";
}

export async function uploadFile(
  file: File,
  folder: string,
): Promise<StoredFile> {
  if (file.size === 0) throw new ValidationError("The file is empty.");
  if (file.size > MAX_BYTES) {
    throw new ValidationError("Files must be 10 MB or smaller.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffMime(buffer);

  if (!mimeType) {
    throw new ValidationError(
      "Only JPG, PNG, WEBP, and PDF files can be uploaded.",
    );
  }

  const name = safeFileName(file.name);
  const extension = path.extname(name).toLowerCase();

  if (!(ALLOWED[mimeType] as readonly string[]).includes(extension)) {
    throw new ValidationError(
      `A ${mimeType} file must use one of: ${ALLOWED[mimeType].join(", ")}`,
    );
  }

  const segment = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "misc";
  const key = `${segment}/${randomUUID()}${extension}`;

  const url =
    env.STORAGE_DRIVER === "cloudinary"
      ? await uploadToCloudinary(buffer, key, mimeType)
      : await uploadToLocalDisk(buffer, key);

  return { url, name, mimeType, sizeBytes: file.size };
}

const STORAGE_ROOT = path.join(process.cwd(), "storage");

async function uploadToLocalDisk(
  bytes: Uint8Array,
  key: string,
): Promise<string> {
  const destination = path.join(STORAGE_ROOT, key);

  if (!destination.startsWith(STORAGE_ROOT + path.sep)) {
    throw new AppError("Invalid storage path.");
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  return `/api/files/${key}`;
}

export function resolveLocalFile(segments: string[]): string | null {
  const target = path.join(STORAGE_ROOT, ...segments);
  const normalised = path.normalize(target);
  if (!normalised.startsWith(STORAGE_ROOT + path.sep)) return null;
  return normalised;
}

async function uploadToCloudinary(
  bytes: Uint8Array,
  key: string,
  mimeType: string,
): Promise<string> {
  const cloudName = env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = env.CLOUDINARY_API_KEY!;
  const apiSecret = env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = key.replace(/\.[^.]+$/, "");
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart], { type: mimeType }));
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("[storage] cloudinary upload failed", response.status, detail);
    throw new AppError("Could not upload the file. Please try again.", {
      status: 502,
      code: "upload_failed",
    });
  }

  const result = (await response.json()) as { secure_url?: string };
  if (!result.secure_url) {
    throw new AppError("Upload succeeded but no URL was returned.", {
      status: 502,
      code: "upload_failed",
    });
  }

  return result.secure_url;
}
