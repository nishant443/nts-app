"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { formatMonthYear, parseDateInput } from "@/lib/dates";
import { env } from "@/lib/env";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { isMailConfigured, payslipEmail, sendMail } from "@/lib/mail";
import { formatCurrency } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { buildPayslipFor, getWorkingDays } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import { renderPayslipPdf } from "@/lib/services/payslip-pdf";
import { getCompanySettings } from "@/lib/settings";
import type { PayrollStatus } from "@/generated/prisma/enums";
import { payrollRunSchema, salaryStructureSchema } from "@/lib/validation";

export const createPayrollRun = formAction(
  { access: "admin", schema: payrollRunSchema },
  async ({ input, user }) => {
    const existing = await prisma.payrollRun.findUnique({
      where: { year_month: { year: input.year, month: input.month } },
      select: { id: true },
    });

    if (existing) {
      return formError(
        `A payroll run already exists for ${formatMonthYear(input.month, input.year)}.`,
      );
    }

    const run = await prisma.payrollRun.create({
      data: {
        month: input.month,
        year: input.year,
        notes: input.notes ?? null,
        status: "DRAFT",
        createdById: user.id,
      },
      select: { id: true },
    });

    await recordAudit({
      userId: user.id,
      action: "payroll.run_created",
      entity: "PayrollRun",
      entityId: run.id,
      meta: { month: input.month, year: input.year },
    });

    revalidatePath("/admin/payroll");
    await flash("Payroll run created.");
    redirect(`/admin/payroll/${run.id}`);
  },
);

export const generatePayslips = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: input.id },
      select: { id: true, month: true, year: true, status: true },
    });

    if (!run) throw new NotFoundError("That payroll run no longer exists.");

    if (run.status === "FINALIZED" || run.status === "PAID") {
      throw new ConflictError(
        "This run has been finalized. Reopen it before regenerating payslips.",
      );
    }

    const { generated, skipped } = await buildRunPayslips(run);

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "PROCESSING" },
    });

    await recordAudit({
      userId: user.id,
      action: "payroll.payslips_generated",
      entity: "PayrollRun",
      entityId: run.id,
      meta: { generated, skipped },
    });

    revalidatePath(`/admin/payroll/${run.id}`);
    revalidatePath("/admin/payroll");
  },
);

export const setPayrollStatus = action<
  { id: string; status: string },
  PayslipDelivery | null
>({ access: "admin" }, async ({ input, user }) => {
  const allowed = ["DRAFT", "PROCESSING", "FINALIZED", "PAID"] as const;

  if (!(allowed as readonly string[]).includes(input.status)) {
    throw new ConflictError("That is not a valid payroll status.");
  }

  const run = await prisma.payrollRun.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      month: true,
      year: true,
      status: true,
      _count: { select: { payslips: true } },
    },
  });

  if (!run) throw new NotFoundError("That payroll run no longer exists.");

  if (
    (input.status === "FINALIZED" || input.status === "PAID") &&
    run._count.payslips === 0
  ) {
    throw new ConflictError("Generate payslips before finalizing this run.");
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: input.status as PayrollStatus,
      finalizedAt: input.status === "FINALIZED" ? new Date() : undefined,
      paidAt: input.status === "PAID" ? new Date() : undefined,
    },
  });

  let delivery: PayslipDelivery | null = null;
  if (input.status === "FINALIZED" && run.status !== "FINALIZED") {
    await buildRunPayslips(run);
    delivery = await emailPayslips(run.id, run.month, run.year);
  }

  await recordAudit({
    userId: user.id,
    action: "payroll.status_changed",
    entity: "PayrollRun",
    entityId: run.id,
    meta: { from: run.status, to: input.status, ...delivery },
  });

  revalidatePath("/admin/payroll");
  revalidatePath(`/admin/payroll/${run.id}`);
  revalidatePath("/payslips");

  return delivery;
});

export const resendPayslipEmails = action<{ id: string }, PayslipDelivery>(
  { access: "admin" },
  async ({ input, user }) => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: input.id },
      select: { id: true, month: true, year: true, status: true },
    });

    if (!run) throw new NotFoundError("That payroll run no longer exists.");

    if (run.status !== "FINALIZED" && run.status !== "PAID") {
      throw new ConflictError("Finalize the run before emailing payslips.");
    }

    const delivery = await emailPayslips(run.id, run.month, run.year);

    await recordAudit({
      userId: user.id,
      action: "payroll.payslips_emailed",
      entity: "PayrollRun",
      entityId: run.id,
      meta: { ...delivery },
    });

    return delivery;
  },
);

interface PayslipDelivery {
  emailed: number;
  failed: number;
  skipped: number;
}

async function buildRunPayslips(run: {
  id: string;
  month: number;
  year: number;
}): Promise<{ generated: number; skipped: number }> {
  const [employees, workingDays] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      orderBy: { employeeCode: "asc" },
    }),
    getWorkingDays(run.month, run.year),
  ]);

  let generated = 0;
  let skipped = 0;

  for (const employee of employees) {
    const computed = await buildPayslipFor(
      employee.id,
      run.month,
      run.year,
      workingDays,
    );

    if (!computed) {
      skipped += 1;
      continue;
    }

    const data = {
      month: run.month,
      year: run.year,
      workingDays: computed.workingDays,
      presentDays: computed.presentDays,
      paidLeaveDays: computed.paidLeaveDays,
      lopDays: computed.lopDays,
      basic: computed.basic,
      hra: computed.hra,
      conveyance: computed.conveyance,
      medical: computed.medical,
      specialAllowance: computed.specialAllowance,
      otherAllowance: computed.otherAllowance,
      reimbursements: computed.reimbursements,
      pfDeduction: computed.pfDeduction,
      esiDeduction: computed.esiDeduction,
      professionalTax: computed.professionalTax,
      tdsDeduction: computed.tdsDeduction,
      lopDeduction: computed.lopDeduction,
      otherDeduction: computed.otherDeduction,
      grossEarnings: computed.grossEarnings,
      totalDeductions: computed.totalDeductions,
      netPay: computed.netPay,
    };

    await prisma.payslip.upsert({
      where: {
        payrollRunId_userId: { payrollRunId: run.id, userId: employee.id },
      },
      create: { ...data, payrollRunId: run.id, userId: employee.id },
      update: data,
    });

    generated += 1;
  }

  return { generated, skipped };
}

async function emailPayslips(
  runId: string,
  month: number,
  year: number,
): Promise<PayslipDelivery> {
  const period = formatMonthYear(month, year);
  const payslips = await prisma.payslip.findMany({
    where: { payrollRunId: runId },
    select: { id: true, userId: true, user: { select: { status: true } } },
  });

  const settings = await getCompanySettings();
  const link = `${env.NEXT_PUBLIC_APP_URL}/payslips`;
  const mailReady = isMailConfigured();
  const delivery: PayslipDelivery = { emailed: 0, failed: 0, skipped: 0 };

  for (const entry of payslips) {
    await notify({
      userId: entry.userId,
      type: "PAYSLIP_READY",
      title: `Payslip for ${period} is ready`,
      body: "Your payslip is available to view and download.",
      link: "/payslips",
      email: false,
    });

    if (!mailReady || entry.user.status !== "ACTIVE") {
      delivery.skipped += 1;
      continue;
    }

    try {
      const { buffer, filename, payslip } = await renderPayslipPdf(entry.id);
      const { subject, text, html } = payslipEmail({
        employeeName: payslip.user.name,
        period,
        approvedExpenses:
          payslip.reimbursements > 0
            ? formatCurrency(payslip.reimbursements)
            : null,
        grossEarnings: formatCurrency(payslip.grossEarnings),
        totalDeductions: formatCurrency(payslip.totalDeductions),
        netPay: formatCurrency(payslip.netPay),
        hasAttachment: true,
        hrContact: { email: settings.email, phone: settings.phone },
        companyName: settings.name,
        link,
      });
      await sendMail({
        to: payslip.user.email,
        subject,
        text,
        html,
        attachments: [
          { filename, content: buffer, contentType: "application/pdf" },
        ],
      });
      delivery.emailed += 1;
    } catch (error) {
      console.error("[payroll] payslip email failed", entry.id, error);
      delivery.failed += 1;
    }
  }

  return delivery;
}

export const deletePayrollRun = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: input.id },
      select: { id: true, status: true, month: true, year: true },
    });

    if (!run) throw new NotFoundError("That payroll run no longer exists.");

    if (run.status === "FINALIZED" || run.status === "PAID") {
      throw new ConflictError(
        "A finalized run is part of the pay record and cannot be deleted.",
      );
    }

    await prisma.payrollRun.delete({ where: { id: run.id } });

    await recordAudit({
      userId: user.id,
      action: "payroll.run_deleted",
      entity: "PayrollRun",
      entityId: run.id,
      meta: { month: run.month, year: run.year },
    });

    revalidatePath("/admin/payroll");
  },
);

export const saveSalaryStructure = formAction(
  { access: "admin", schema: salaryStructureSchema },
  async ({ input, user }) => {
    const employee = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true },
    });

    if (!employee) return formError("That employee could not be found.");

    const effectiveFrom = parseDateInput(input.effectiveFrom);

    await prisma.salaryStructure.upsert({
      where: {
        userId_effectiveFrom: { userId: input.userId, effectiveFrom },
      },
      create: {
        userId: input.userId,
        effectiveFrom,
        basic: input.basic,
        hra: input.hra,
        conveyance: input.conveyance,
        medical: input.medical,
        specialAllowance: input.specialAllowance,
        otherAllowance: input.otherAllowance,
        pfDeduction: input.pfDeduction,
        esiDeduction: input.esiDeduction,
        professionalTax: input.professionalTax,
        tdsDeduction: input.tdsDeduction,
        otherDeduction: input.otherDeduction,
        notes: input.notes ?? null,
      },
      update: {
        basic: input.basic,
        hra: input.hra,
        conveyance: input.conveyance,
        medical: input.medical,
        specialAllowance: input.specialAllowance,
        otherAllowance: input.otherAllowance,
        pfDeduction: input.pfDeduction,
        esiDeduction: input.esiDeduction,
        professionalTax: input.professionalTax,
        tdsDeduction: input.tdsDeduction,
        otherDeduction: input.otherDeduction,
        notes: input.notes ?? null,
      },
    });

    await recordAudit({
      userId: user.id,
      action: "salary.structure_saved",
      entity: "SalaryStructure",
      meta: {
        employee: employee.name,
        effectiveFrom: input.effectiveFrom,
        basic: input.basic,
      },
    });

    revalidatePath(`/admin/employees/${input.userId}`);

    return formSuccess(`Salary structure saved for ${employee.name}.`);
  },
);
