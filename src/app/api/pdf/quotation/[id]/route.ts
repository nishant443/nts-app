import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import { buildQuotationPdf } from "@/lib/services/document-pdf-builder";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/pdf/quotation/[id]">,
) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(
      `pdf:${user.id}`,
      RateLimits.export.limit,
      RateLimits.export.windowSeconds,
    );

    const { id } = await context.params;
    const document = await buildQuotationPdf(id);

    return new Response(new Uint8Array(document.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
