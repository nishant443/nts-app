"use server";

import { revalidatePath } from "next/cache";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { today } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { attendanceMarkSchema } from "@/lib/validation";

/**
 * Attendance actions.
 *
 * Self check-in writes exactly one row per employee per day (enforced by a
 * unique constraint on `userId + date`), so a double submit cannot create a
 * second record or reset the morning's check-in time.
 */

export const checkIn = action<void>({ access: "user" }, async ({ user }) => {
  const date = today();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
    select: { id: true, checkInAt: true },
  });

  if (existing?.checkInAt) {
    throw new AppError("You have already checked in today.");
  }

  await prisma.attendance.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: {
      userId: user.id,
      date,
      status: "PRESENT",
      checkInAt: now,
      source: "SELF_CHECK_IN",
    },
    update: { status: "PRESENT", checkInAt: now, source: "SELF_CHECK_IN" },
  });

  await recordAudit({
    userId: user.id,
    action: "attendance.check_in",
    entity: "Attendance",
    meta: { date: date.toISOString() },
  });

  revalidatePath("/dashboard");
  revalidatePath("/attendance");
});

export const checkOut = action<void>({ access: "user" }, async ({ user }) => {
  const date = today();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
    select: { id: true, checkInAt: true, checkOutAt: true },
  });

  if (!existing?.checkInAt) {
    throw new AppError("Check in before checking out.");
  }
  if (existing.checkOutAt) {
    throw new AppError("You have already checked out today.");
  }

  const workedMinutes = Math.max(
    0,
    Math.round((now.getTime() - existing.checkInAt.getTime()) / 60_000),
  );

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutAt: now,
      workedMinutes,
      // Less than four hours on site is recorded as a half day.
      status: workedMinutes < 240 ? "HALF_DAY" : "PRESENT",
    },
  });

  await recordAudit({
    userId: user.id,
    action: "attendance.check_out",
    entity: "Attendance",
    entityId: existing.id,
    meta: { workedMinutes },
  });

  revalidatePath("/dashboard");
  revalidatePath("/attendance");
});

/** Admin override — correcting the register for any employee and date. */
export const markAttendance = formAction(
  { access: "admin", schema: attendanceMarkSchema },
  async ({ input, user }) => {
    const date = new Date(`${input.date}T00:00:00.000Z`);

    const employee = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true },
    });

    if (!employee) return formError("That employee could not be found.");

    // Times arrive as "HH:mm" from a <input type="time">.
    const toDateTime = (value: string | undefined) => {
      if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
      const [hours, minutes] = value.split(":").map(Number);
      const result = new Date(date);
      result.setUTCHours(hours!, minutes!, 0, 0);
      return result;
    };

    const checkInAt = toDateTime(input.checkInAt);
    const checkOutAt = toDateTime(input.checkOutAt);

    if (checkInAt && checkOutAt && checkOutAt <= checkInAt) {
      return formError("Check-out must be after check-in.", {
        checkOutAt: ["Check-out must be after check-in."],
      });
    }

    const workedMinutes =
      checkInAt && checkOutAt
        ? Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60_000)
        : 0;

    await prisma.attendance.upsert({
      where: { userId_date: { userId: input.userId, date } },
      create: {
        userId: input.userId,
        date,
        status: input.status,
        checkInAt,
        checkOutAt,
        workedMinutes,
        notes: input.notes,
        source: "MANUAL",
      },
      update: {
        status: input.status,
        checkInAt,
        checkOutAt,
        workedMinutes,
        notes: input.notes,
        source: "MANUAL",
      },
    });

    await recordAudit({
      userId: user.id,
      action: "attendance.marked",
      entity: "Attendance",
      meta: {
        employeeId: input.userId,
        date: input.date,
        status: input.status,
      },
    });

    revalidatePath("/admin/attendance");
    revalidatePath("/attendance");

    return formSuccess(`Attendance updated for ${employee.name}.`);
  },
);
