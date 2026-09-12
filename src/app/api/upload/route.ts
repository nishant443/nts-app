import { json, withRoute } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { RateLimits } from "@/lib/rate-limit";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";

/** Folders a client is allowed to write into. */
const FOLDERS = new Set(["receipts", "documents", "avatars"]);

/**
 * Single-file upload.
 *
 * The file's real type is sniffed from its bytes inside `uploadFile` — the
 * browser-supplied MIME type is not trusted.
 */
export const POST = withRoute(
  { access: "user", rateLimit: RateLimits.upload },
  async ({ request }) => {
    const formData = await request.formData();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("No file was uploaded.");
    }

    const folder = String(formData.get("folder") ?? "documents");
    if (!FOLDERS.has(folder)) {
      throw new ValidationError("That upload folder is not allowed.");
    }

    const stored = await uploadFile(file, folder);

    return json(stored, { status: 201 });
  },
);
