import { readFile } from "node:fs/promises";
import path from "node:path";

// Rendered once at build time, so the source file is read during the build
// and never needs to ship with the server bundle.
export const dynamic = "force-static";

export async function GET() {
  const source = await readFile(
    path.join(process.cwd(), "src/pwa/service-worker.js"),
    "utf8",
  );
  const script = source.replaceAll(
    "__BUILD_ID__",
    process.env.NEXT_PUBLIC_BUILD_ID ?? "local",
  );

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
