"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { isWeekOff, parseDateInput } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { toMoney } from "@/lib/money";
import { notify, notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { leaveBalanceSchema, leaveRequestSchema, leaveReviewSchema } from "@/lib/validation";

async function countLeaveDays(start: Date, end: Date, halfDay: boolean) {
  if (halfDay) return 0.5;

  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  });

  const holidayKeys = new Set(
    holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)),
  );

  let days = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (!isWeekOff(cursor) && !holidayKeys.has(cursor.toISOString().slice(0, 10))) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export const submitLeaveRequest = formAction(
  { access: "user", schema: leaveRequestSchema },
  async ({ input, user }) => {
    const startDate = parseDateInput(input.startDate);
    const endDate = parseDateInput(input.endDate);

    const days = await countLeaveDays(startDate, endDate, input.halfDay);

    if (days <= 0) {
      return formError(
        "Those dates are all weekly offs or holidays — no leave is needed.",
        { startDate: ["Select at least one working day."] },
      );
    }

    const clash = await prisma.leaveRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    });

    if (clash) {
      return formError(
        "You already have a leave request covering some of those dates.",
        { startDate: ["Overlaps an existing request."] },
      );
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        type: input.type,
        startDate,
        endDate,
        days,
        reason: input.reason,
        status: "PENDING",
      },
      select: { id: true },
    });

    await notifyAdmins({
      type: "LEAVE_SUBMITTED",
      title: `${user.name} requested leave`,
      body: `${days} day(s) of ${input.type.toLowerCase().replace("_", " ")} leave awaiting approval.`,
      link: "/admin/approvals?tab=leave",
    });

    await recordAudit({
      userId: user.id,
      action: "leave.submitted",
      entity: "LeaveRequest",
      entityId: request.id,
      meta: { type: input.type, days },
    });

    revalidatePath("/leave");
    revalidatePath("/admin/approvals");

    await flash("Leave request submitted for approval.");
    redirect("/leave");
  },
);

export const reviewLeaveRequest = formAction(
  { access: "admin", schema: leaveReviewSchema },
  async ({ input, user }) => {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        type: true,
        days: true,
        status: true,
        startDate: true,
        user: { select: { name: true } },
      },
    });

    if (!request) throw new NotFoundError("That leave request no longer exists.");

    if (request.status !== "PENDING") {
      return formError("This request has already been reviewed.");
    }

    const days = toMoney(request.days);
    const year = request.startDate.getUTCFullYear();

    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: input.decision,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
        },
      });

      if (input.decision === "APPROVED") {
        await tx.leaveBalance.upsert({
          where: {
            userId_year_type: {
              userId: request.userId,
              year,
              type: request.type,
            },
          },
          create: {
            userId: request.userId,
            year,
            type: request.type,
            allocated: 0,
            used: days,
          },
          update: { used: { increment: days } },
        });

        const cursor = new Date(request.startDate);
        const end = await tx.leaveRequest
          .findUnique({ where: { id: request.id }, select: { endDate: true } })
          .then((row) => row!.endDate);

        while (cursor <= end) {
          if (!isWeekOff(cursor)) {
            await tx.attendance.upsert({
              where: {
                userId_date: { userId: request.userId, date: new Date(cursor) },
              },
              create: {
                userId: request.userId,
                date: new Date(cursor),
                status: "ON_LEAVE",
                source: "MANUAL",
                notes: `${request.type} leave`,
              },
              update: { status: "ON_LEAVE" },
            });
          }
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }
    });

    await notify({
      userId: request.userId,
      type: input.decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      title:
        input.decision === "APPROVED"
          ? "Your leave was approved"
          : "Your leave was not approved",
      body: input.reviewNote ?? `${days} day(s) of ${request.type.toLowerCase()} leave.`,
      link: "/leave",
    });

    await recordAudit({
      userId: user.id,
      action: `leave.${input.decision.toLowerCase()}`,
      entity: "LeaveRequest",
      entityId: request.id,
      meta: { employee: request.user.name, days },
    });

    revalidatePath("/leave");
    revalidatePath("/admin/approvals");
    revalidatePath("/dashboard");

    return formSuccess(
      `Leave ${input.decision === "APPROVED" ? "approved" : "rejected"} for ${request.user.name}.`,
    );
  },
);

export const cancelLeaveRequest = action<{ id: string }>(
  { access: "user" },
  async ({ input, user }) => {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: input.id },
      select: { id: true, userId: true, status: true },
    });

    if (!request) throw new NotFoundError("That leave request no longer exists.");

    if (request.userId !== user.id && user.role !== "ADMIN") {
      throw new ConflictError("You can only withdraw your own requests.");
    }

    if (request.status !== "PENDING") {
      throw new ConflictError(
        "Only a pending request can be withdrawn. Ask an administrator to reverse an approved one.",
      );
    }

    await prisma.leaveRequest.update({
      where: { id: input.id },
      data: { status: "CANCELLED" },
    });

    await recordAudit({
      userId: user.id,
      action: "leave.cancelled",
      entity: "LeaveRequest",
      entityId: input.id,
    });

    revalidatePath("/leave");
    revalidatePath("/admin/approvals");
  },
);

export const setLeaveAllocation = formAction(
  { access: "admin", schema: leaveBalanceSchema },
  async ({ input, user }) => {
    await prisma.leaveBalance.upsert({
      where: {
        userId_year_type: {
          userId: input.userId,
          year: input.year,
          type: input.type,
        },
      },
      create: {
        userId: input.userId,
        year: input.year,
        type: input.type,
        allocated: input.allocated,
        used: 0,
      },
      update: { allocated: input.allocated },
    });

    await recordAudit({
      userId: user.id,
      action: "leave.allocation_set",
      entity: "LeaveRequest",
      meta: { employeeId: input.userId, type: input.type, days: input.allocated },
    });

    revalidatePath(`/admin/employees/${input.userId}`);
    revalidatePath("/leave");

    return formSuccess("Leave allocation updated.");
  },
);
