import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import { renderPayslipPdf } from "@/lib/services/payslip-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/pdf/payslip/[id]">,
) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(
      `pdf:${user.id}`,
      RateLimits.export.limit,
      RateLimits.export.windowSeconds,
    );

    const { id } = await context.params;
    const { buffer, filename, payslip } = await renderPayslipPdf(id);

    if (user.role !== "ADMIN" && payslip.userId !== user.id) {
      throw new ForbiddenError("You can only download your own payslips.");
    }

    if (
      user.role !== "ADMIN" &&
      payslip.runStatus !== "FINALIZED" &&
      payslip.runStatus !== "PAID"
    ) {
      throw new NotFoundError("That payslip has not been published yet.");
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
