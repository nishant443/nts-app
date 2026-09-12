"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { formatMonthYear, parseDateInput } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { buildPayslipFor, getWorkingDays } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import type { PayrollStatus } from "@/generated/prisma/enums";
import { payrollRunSchema, salaryStructureSchema } from "@/lib/validation";

/**
 * Payroll actions.
 *
 * A run moves DRAFT → PROCESSING → FINALIZED → PAID. Payslips are recalculated
 * on every generate while the run is still a draft; once finalized the figures
 * are frozen, because that is what employees have been shown and what the bank
 * transfer was based on.
 */

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
    redirect(`/admin/payroll/${run.id}`);
  },
);

/**
 * Builds (or rebuilds) a payslip for every active employee with a salary
 * structure in force for the period.
 */
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

    const [employees, workingDays] = await Promise.all([
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
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

      // No salary structure on record — nothing to pay against.
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

export const setPayrollStatus = action<{ id: string; status: string }>(
  { access: "admin" },
  async ({ input, user }) => {
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
      throw new ConflictError(
        "Generate payslips before finalizing this run.",
      );
    }

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: input.status as PayrollStatus,
        finalizedAt:
          input.status === "FINALIZED" ? new Date() : undefined,
        paidAt: input.status === "PAID" ? new Date() : undefined,
      },
    });

    // Employees are told only once the figures are locked.
    if (input.status === "FINALIZED" && run.status !== "FINALIZED") {
      const payslips = await prisma.payslip.findMany({
        where: { payrollRunId: run.id },
        select: { userId: true },
      });

      for (const payslip of payslips) {
        await notify({
          userId: payslip.userId,
          type: "PAYSLIP_READY",
          title: `Payslip for ${formatMonthYear(run.month, run.year)} is ready`,
          body: "Your payslip is available to view and download.",
          link: "/payslips",
        });
      }
    }

    await recordAudit({
      userId: user.id,
      action: "payroll.status_changed",
      entity: "PayrollRun",
      entityId: run.id,
      meta: { from: run.status, to: input.status },
    });

    revalidatePath("/admin/payroll");
    revalidatePath(`/admin/payroll/${run.id}`);
    revalidatePath("/payslips");
  },
);

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

    // Payslips cascade with the run.
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

// --- Salary structure --------------------------------------------------------

export const saveSalaryStructure = formAction(
  { access: "admin", schema: salaryStructureSchema },
  async ({ input, user }) => {
    const employee = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true },
    });

    if (!employee) return formError("That employee could not be found.");

    const effectiveFrom = parseDateInput(input.effectiveFrom);

    // One structure per effective date; re-saving the same date replaces it.
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
