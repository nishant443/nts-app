import { errorResponse } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { formatMonthYear } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import {
  buildWorkbook,
  sheet,
  spreadsheetHeaders,
  type SheetColumn,
} from "@/lib/excel";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface Row {
  code: string;
  name: string;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
  basic: number;
  allowances: number;
  reimbursements: number;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  lop: number;
  otherDeduction: number;
  deductions: number;
  net: number;
  bankAccount: string;
  ifsc: string;
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/export/payroll/[id]">,
) {
  try {
    const user = await requireApiAdmin();
    enforceRateLimit(
      `export:${user.id}`,
      RateLimits.export.limit,
      RateLimits.export.windowSeconds,
    );

    const { id } = await context.params;

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payslips: {
          orderBy: { user: { employeeCode: "asc" } },
          include: {
            user: {
              select: {
                name: true,
                employeeCode: true,
                profile: {
                  select: { bankAccountNo: true, bankIfsc: true },
                },
              },
            },
          },
        },
      },
    });

    if (!run) throw new NotFoundError("That payroll run no longer exists.");

    const rows: Row[] = run.payslips.map((payslip) => {
      const allowances =
        toMoney(payslip.hra) +
        toMoney(payslip.conveyance) +
        toMoney(payslip.medical) +
        toMoney(payslip.specialAllowance) +
        toMoney(payslip.otherAllowance);

      return {
        code: payslip.user.employeeCode,
        name: payslip.user.name,
        workingDays: toMoney(payslip.workingDays),
        presentDays: toMoney(payslip.presentDays),
        paidLeaveDays: toMoney(payslip.paidLeaveDays),
        lopDays: toMoney(payslip.lopDays),
        basic: toMoney(payslip.basic),
        allowances,
        reimbursements: toMoney(payslip.reimbursements),
        gross: toMoney(payslip.grossEarnings),
        pf: toMoney(payslip.pfDeduction),
        esi: toMoney(payslip.esiDeduction),
        pt: toMoney(payslip.professionalTax),
        tds: toMoney(payslip.tdsDeduction),
        lop: toMoney(payslip.lopDeduction),
        otherDeduction: toMoney(payslip.otherDeduction),
        deductions: toMoney(payslip.totalDeductions),
        net: toMoney(payslip.netPay),
        bankAccount: payslip.user.profile?.bankAccountNo ?? "",
        ifsc: payslip.user.profile?.bankIfsc ?? "",
      };
    });

    const columns: SheetColumn<Row>[] = [
      { header: "Code", key: "code", width: 10, value: (r) => r.code },
      { header: "Employee", key: "name", width: 24, value: (r) => r.name },
      { header: "Working days", key: "workingDays", width: 13, value: (r) => r.workingDays },
      { header: "Present", key: "presentDays", width: 10, value: (r) => r.presentDays },
      { header: "Paid leave", key: "paidLeaveDays", width: 11, value: (r) => r.paidLeaveDays },
      { header: "LOP days", key: "lopDays", width: 10, value: (r) => r.lopDays },
      { header: "Basic", key: "basic", width: 14, money: true, value: (r) => r.basic },
      { header: "Allowances", key: "allowances", width: 14, money: true, value: (r) => r.allowances },
      { header: "Approved expenses", key: "reimbursements", width: 15, money: true, value: (r) => r.reimbursements },
      { header: "Gross", key: "gross", width: 14, money: true, value: (r) => r.gross },
      { header: "PF", key: "pf", width: 12, money: true, value: (r) => r.pf },
      { header: "ESI", key: "esi", width: 12, money: true, value: (r) => r.esi },
      { header: "PT", key: "pt", width: 12, money: true, value: (r) => r.pt },
      { header: "TDS", key: "tds", width: 12, money: true, value: (r) => r.tds },
      { header: "LOP", key: "lop", width: 12, money: true, value: (r) => r.lop },
      { header: "Other", key: "otherDeduction", width: 12, money: true, value: (r) => r.otherDeduction },
      { header: "Deductions", key: "deductions", width: 14, money: true, value: (r) => r.deductions },
      { header: "Net pay", key: "net", width: 15, money: true, value: (r) => r.net },
      { header: "Bank account", key: "bankAccount", width: 20, value: (r) => r.bankAccount },
      { header: "IFSC", key: "ifsc", width: 14, value: (r) => r.ifsc },
    ];

    const sum = (pick: (row: Row) => number) =>
      Math.round(rows.reduce((total, row) => total + pick(row), 0) * 100) / 100;

    const period = formatMonthYear(run.month, run.year);

    const buffer = await buildWorkbook({
      title: `Payroll register — ${period}`,
      subtitle: `Nutan Tech Solutions · ${rows.length} employees · status ${run.status.toLowerCase()}`,
      sheets: [
        sheet<Row>({
          name: "Payroll",
          columns,
          rows,
          totals: {
            basic: sum((r) => r.basic),
            allowances: sum((r) => r.allowances),
            reimbursements: sum((r) => r.reimbursements),
            gross: sum((r) => r.gross),
            deductions: sum((r) => r.deductions),
            net: sum((r) => r.net),
          },
        }),
      ],
    });

    return new Response(new Uint8Array(buffer), {
      headers: spreadsheetHeaders(
        `Payroll-${run.year}-${String(run.month).padStart(2, "0")}.xlsx`,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
