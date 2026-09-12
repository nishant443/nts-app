import { renderToBuffer } from "@react-pdf/renderer";

import { errorResponse } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { formatDate, formatMonthYear } from "@/lib/dates";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { toMoney } from "@/lib/money";
import { loadPdfAssets } from "@/lib/pdf/document-pdf";
import { PayslipPdf } from "@/lib/pdf/payslip-pdf";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import { getCompanySettings } from "@/lib/settings";

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

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            profile: true,
          },
        },
        payrollRun: { select: { status: true } },
      },
    });

    if (!payslip) throw new NotFoundError("That payslip no longer exists.");

    // An employee may only ever download their own payslip.
    if (user.role !== "ADMIN" && payslip.userId !== user.id) {
      throw new ForbiddenError("You can only download your own payslips.");
    }

    // Draft figures are not final and must not leave the building.
    if (
      user.role !== "ADMIN" &&
      payslip.payrollRun.status !== "FINALIZED" &&
      payslip.payrollRun.status !== "PAID"
    ) {
      throw new NotFoundError("That payslip has not been published yet.");
    }

    const [settings, assets] = await Promise.all([
      getCompanySettings(),
      loadPdfAssets(),
    ]);

    const profile = payslip.user.profile;

    // Zero-value components are omitted rather than printed as 0.00.
    const earnings = [
      { label: "Basic", value: toMoney(payslip.basic) },
      { label: "House rent allowance", value: toMoney(payslip.hra) },
      { label: "Conveyance", value: toMoney(payslip.conveyance) },
      { label: "Medical", value: toMoney(payslip.medical) },
      { label: "Special allowance", value: toMoney(payslip.specialAllowance) },
      { label: "Other allowance", value: toMoney(payslip.otherAllowance) },
      { label: "Reimbursements", value: toMoney(payslip.reimbursements) },
    ].filter((entry) => entry.value > 0);

    const deductions = [
      { label: "Provident fund", value: toMoney(payslip.pfDeduction) },
      { label: "ESI", value: toMoney(payslip.esiDeduction) },
      { label: "Professional tax", value: toMoney(payslip.professionalTax) },
      { label: "TDS", value: toMoney(payslip.tdsDeduction) },
      { label: "Loss of pay", value: toMoney(payslip.lopDeduction) },
      { label: "Other deduction", value: toMoney(payslip.otherDeduction) },
    ].filter((entry) => entry.value > 0);

    const buffer = await renderToBuffer(
      PayslipPdf({
        settings,
        employee: {
          name: payslip.user.name,
          employeeCode: payslip.user.employeeCode,
          designation: profile?.designation ?? null,
          department: profile?.department ?? null,
          dateOfJoining: profile?.dateOfJoining
            ? formatDate(profile.dateOfJoining)
            : null,
          panNumber: profile?.panNumber ?? null,
          uanNumber: profile?.uanNumber ?? null,
          bankName: profile?.bankName ?? null,
          bankAccountNo: profile?.bankAccountNo ?? null,
        },
        period: formatMonthYear(payslip.month, payslip.year),
        attendance: {
          workingDays: toMoney(payslip.workingDays),
          presentDays: toMoney(payslip.presentDays),
          paidLeaveDays: toMoney(payslip.paidLeaveDays),
          lopDays: toMoney(payslip.lopDays),
        },
        earnings,
        deductions,
        grossEarnings: toMoney(payslip.grossEarnings),
        totalDeductions: toMoney(payslip.totalDeductions),
        netPay: toMoney(payslip.netPay),
        assets,
      }),
    );

    const filename = `Payslip-${payslip.user.employeeCode}-${payslip.month}-${payslip.year}.pdf`;

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
