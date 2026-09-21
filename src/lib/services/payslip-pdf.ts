import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate, formatMonthYear } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { toMoney } from "@/lib/money";
import { loadPdfAssets } from "@/lib/pdf/document-pdf";
import { PayslipPdf } from "@/lib/pdf/payslip-pdf";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export interface RenderedPayslip {
  buffer: Buffer;
  filename: string;
  payslip: {
    id: string;
    userId: string;
    month: number;
    year: number;
    runStatus: string;
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
    user: { name: string; email: string; employeeCode: string };
  };
}

export async function renderPayslipPdf(id: string): Promise<RenderedPayslip> {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          profile: true,
        },
      },
      payrollRun: { select: { status: true } },
    },
  });

  if (!payslip) throw new NotFoundError("That payslip no longer exists.");

  const [settings, assets] = await Promise.all([
    getCompanySettings(),
    loadPdfAssets(),
  ]);

  const profile = payslip.user.profile;

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

  return {
    buffer,
    filename: `Payslip-${payslip.user.employeeCode}-${payslip.month}-${payslip.year}.pdf`,
    payslip: {
      id: payslip.id,
      userId: payslip.userId,
      month: payslip.month,
      year: payslip.year,
      runStatus: payslip.payrollRun.status,
      grossEarnings: toMoney(payslip.grossEarnings),
      totalDeductions: toMoney(payslip.totalDeductions),
      netPay: toMoney(payslip.netPay),
      user: {
        name: payslip.user.name,
        email: payslip.user.email,
        employeeCode: payslip.user.employeeCode,
      },
    },
  };
}
