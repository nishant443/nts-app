"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { notify, notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  expenseReviewSchema,
  expenseSchema,
  workLogReviewSchema,
  workLogSchema,
} from "@/lib/validation";

/**
 * Daily work reports and the expenses attached to them.
 *
 * An employee owns their own entries and may edit them until an admin has
 * reviewed one — after that the record is evidence for payroll and billing and
 * is locked.
 */

export const saveWorkLog = formAction(
  { access: "user", schema: workLogSchema },
  async ({ input, user }) => {
    const date = parseDateInput(input.date);

    if (input.id) {
      const existing = await prisma.dailyWorkLog.findUnique({
        where: { id: input.id },
        select: { id: true, userId: true, status: true },
      });

      if (!existing) throw new NotFoundError("That work report no longer exists.");

      if (existing.userId !== user.id && user.role !== "ADMIN") {
        return formError("You can only edit your own work reports.");
      }

      if (existing.status === "APPROVED" && user.role !== "ADMIN") {
        return formError(
          "This report has been approved and can no longer be edited.",
        );
      }

      await prisma.dailyWorkLog.update({
        where: { id: input.id },
        data: {
          date,
          title: input.title,
          description: input.description,
          hoursSpent: input.hoursSpent,
          customerId: input.customerId ?? null,
          // Editing a rejected report puts it back in the queue.
          status: existing.status === "REJECTED" ? "SUBMITTED" : existing.status,
        },
      });

      revalidatePath("/work-logs");
      revalidatePath(`/work-logs/${input.id}`);
      await flash("Work report updated.");
      redirect(`/work-logs/${input.id}`);
    }

    const created = await prisma.dailyWorkLog.create({
      data: {
        userId: user.id,
        date,
        title: input.title,
        description: input.description,
        hoursSpent: input.hoursSpent,
        customerId: input.customerId ?? null,
        status: "SUBMITTED",
      },
      select: { id: true },
    });

    await notifyAdmins({
      type: "WORKLOG_SUBMITTED",
      title: `${user.name} submitted a work report`,
      body: input.title,
      link: "/admin/approvals?tab=work",
    });

    await recordAudit({
      userId: user.id,
      action: "worklog.created",
      entity: "DailyWorkLog",
      entityId: created.id,
      meta: { hours: input.hoursSpent },
    });

    revalidatePath("/work-logs");
    revalidatePath("/dashboard");

    await flash("Work report submitted.");
    redirect(`/work-logs/${created.id}`);
  },
);

export const reviewWorkLog = formAction(
  { access: "admin", schema: workLogReviewSchema },
  async ({ input, user }) => {
    const log = await prisma.dailyWorkLog.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
        user: { select: { name: true } },
      },
    });

    if (!log) throw new NotFoundError("That work report no longer exists.");

    await prisma.dailyWorkLog.update({
      where: { id: input.id },
      data: {
        status: input.decision,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote ?? null,
      },
    });

    await notify({
      userId: log.userId,
      type:
        input.decision === "APPROVED" ? "WORKLOG_APPROVED" : "WORKLOG_REJECTED",
      title:
        input.decision === "APPROVED"
          ? "Work report approved"
          : "Work report needs changes",
      body: input.reviewNote ?? log.title,
      link: `/work-logs/${log.id}`,
    });

    await recordAudit({
      userId: user.id,
      action: `worklog.${input.decision.toLowerCase()}`,
      entity: "DailyWorkLog",
      entityId: log.id,
      meta: { employee: log.user.name },
    });

    revalidatePath("/work-logs");
    revalidatePath("/admin/approvals");

    return formSuccess(
      `Report ${input.decision === "APPROVED" ? "approved" : "returned"}.`,
    );
  },
);

export const deleteWorkLog = action<{ id: string }>(
  { access: "user" },
  async ({ input, user }) => {
    const log = await prisma.dailyWorkLog.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        status: true,
        _count: { select: { expenses: true } },
      },
    });

    if (!log) throw new NotFoundError("That work report no longer exists.");

    if (log.userId !== user.id && user.role !== "ADMIN") {
      throw new ConflictError("You can only delete your own work reports.");
    }

    if (log.status === "APPROVED" && user.role !== "ADMIN") {
      throw new ConflictError("An approved report cannot be deleted.");
    }

    if (log._count.expenses > 0) {
      throw new ConflictError(
        "Expenses are attached to this report. Remove them first.",
      );
    }

    await prisma.dailyWorkLog.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "worklog.deleted",
      entity: "DailyWorkLog",
      entityId: input.id,
    });

    revalidatePath("/work-logs");
  },
);

// --- Expenses ----------------------------------------------------------------

export const saveExpense = formAction(
  { access: "user", schema: expenseSchema },
  async ({ input, user }) => {
    const date = parseDateInput(input.date);

    if (input.id) {
      const existing = await prisma.expense.findUnique({
        where: { id: input.id },
        select: { id: true, userId: true, status: true },
      });

      if (!existing) throw new NotFoundError("That expense no longer exists.");

      if (existing.userId !== user.id && user.role !== "ADMIN") {
        return formError("You can only edit your own expenses.");
      }

      if (existing.status !== "PENDING" && user.role !== "ADMIN") {
        return formError(
          "This claim has already been reviewed and can no longer be edited.",
        );
      }

      await prisma.expense.update({
        where: { id: input.id },
        data: {
          date,
          category: input.category,
          amount: input.amount,
          description: input.description,
          workLogId: input.workLogId ?? null,
          receiptUrl: input.receiptUrl ?? null,
        },
      });

      revalidatePath("/expenses");
      await flash("Expense claim updated.");
      await flash("Expense claim submitted.");
    redirect("/expenses");
    }

    const created = await prisma.expense.create({
      data: {
        userId: user.id,
        date,
        category: input.category,
        amount: input.amount,
        description: input.description,
        workLogId: input.workLogId ?? null,
        receiptUrl: input.receiptUrl ?? null,
        status: "PENDING",
      },
      select: { id: true },
    });

    await notifyAdmins({
      type: "EXPENSE_SUBMITTED",
      title: `${user.name} submitted an expense claim`,
      body: `${input.category.toLowerCase()} — ${input.amount.toFixed(2)}`,
      link: "/admin/approvals?tab=expenses",
    });

    await recordAudit({
      userId: user.id,
      action: "expense.created",
      entity: "Expense",
      entityId: created.id,
      meta: { amount: input.amount, category: input.category },
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    redirect("/expenses");
  },
);

export const reviewExpense = formAction(
  { access: "admin", schema: expenseReviewSchema },
  async ({ input, user }) => {
    const expense = await prisma.expense.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        amount: true,
        category: true,
        user: { select: { name: true } },
      },
    });

    if (!expense) throw new NotFoundError("That expense no longer exists.");

    await prisma.expense.update({
      where: { id: input.id },
      data: {
        status: input.decision,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote ?? null,
      },
    });

    await notify({
      userId: expense.userId,
      type:
        input.decision === "REJECTED"
          ? "EXPENSE_REJECTED"
          : "EXPENSE_APPROVED",
      title:
        input.decision === "REJECTED"
          ? "Expense claim declined"
          : input.decision === "REIMBURSED"
            ? "Expense reimbursed"
            : "Expense claim approved",
      body: input.reviewNote ?? `${expense.category.toLowerCase()} claim.`,
      link: "/expenses",
    });

    await recordAudit({
      userId: user.id,
      action: `expense.${input.decision.toLowerCase()}`,
      entity: "Expense",
      entityId: expense.id,
      meta: { employee: expense.user.name },
    });

    revalidatePath("/expenses");
    revalidatePath("/admin/approvals");

    return formSuccess("Expense updated.");
  },
);

export const deleteExpense = action<{ id: string }>(
  { access: "user" },
  async ({ input, user }) => {
    const expense = await prisma.expense.findUnique({
      where: { id: input.id },
      select: { id: true, userId: true, status: true },
    });

    if (!expense) throw new NotFoundError("That expense no longer exists.");

    if (expense.userId !== user.id && user.role !== "ADMIN") {
      throw new ConflictError("You can only delete your own expenses.");
    }

    if (expense.status !== "PENDING" && user.role !== "ADMIN") {
      throw new ConflictError("A reviewed claim cannot be deleted.");
    }

    await prisma.expense.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "expense.deleted",
      entity: "Expense",
      entityId: input.id,
    });

    revalidatePath("/expenses");
  },
);
