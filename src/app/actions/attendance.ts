"use server";

import { revalidatePath } from "next/cache";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import {
  checkGeofence,
  type Geofence,
  type Position,
} from "@/lib/attendance-rules";
import { recordAudit } from "@/lib/audit";
import { BUSINESS_UTC_OFFSET, today } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getCheckInGate } from "@/lib/services/check-in";
import { getEffectiveLocation } from "@/lib/services/work-locations";
import { attendanceMarkSchema, positionSchema } from "@/lib/validation";

async function verifyPosition(
  raw: unknown,
  fence: Geofence | null,
): Promise<{ position: Position; distance: number }> {
  if (!fence) {
    throw new AppError(
      "No work location has been set for you yet. Ask your admin to set one.",
    );
  }

  const parsed = positionSchema.safeParse(raw ?? null);
  const result = checkGeofence(fence, parsed.success ? parsed.data : null);
  if (!result.ok) throw new AppError(result.message);
  return { position: parsed.data as Position, distance: result.distance };
}

export const checkIn = action<Position | null>({ access: "user" }, async ({ input, user }) => {
  const date = today();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
    select: { id: true, checkInAt: true },
  });

  if (existing?.checkInAt) {
    throw new AppError("You have already checked in today.");
  }

  const gate = await getCheckInGate(user.id);
  if (!gate.open) throw new AppError(gate.message);

  const { position, distance } = await verifyPosition(
    input,
    await getEffectiveLocation(user.id, date),
  );
  const where = {
    checkInLatitude: position.latitude,
    checkInLongitude: position.longitude,
    checkInDistanceM: distance,
  };

  await prisma.attendance.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: {
      userId: user.id,
      date,
      status: "PRESENT",
      checkInAt: now,
      source: "SELF_CHECK_IN",
      ...where,
    },
    update: { status: "PRESENT", checkInAt: now, source: "SELF_CHECK_IN", ...where },
  });

  await recordAudit({
    userId: user.id,
    action: "attendance.check_in",
    entity: "Attendance",
    meta: { date: date.toISOString(), distanceM: distance },
  });

  revalidatePath("/dashboard");
  revalidatePath("/attendance");
});

export const checkOut = action<Position | null>({ access: "user" }, async ({ input, user }) => {
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

  const { position, distance } = await verifyPosition(
    input,
    await getEffectiveLocation(user.id, date),
  );

  const workedMinutes = Math.max(
    0,
    Math.round((now.getTime() - existing.checkInAt.getTime()) / 60_000),
  );

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutAt: now,
      workedMinutes,
      status: workedMinutes < 240 ? "HALF_DAY" : "PRESENT",
      checkOutLatitude: position.latitude,
      checkOutLongitude: position.longitude,
      checkOutDistanceM: distance,
    },
  });

  await recordAudit({
    userId: user.id,
    action: "attendance.check_out",
    entity: "Attendance",
    entityId: existing.id,
    meta: { workedMinutes, distanceM: distance },
  });

  revalidatePath("/dashboard");
  revalidatePath("/attendance");
});

export const markAttendance = formAction(
  { access: "admin", schema: attendanceMarkSchema },
  async ({ input, user }) => {
    const date = new Date(`${input.date}T00:00:00.000Z`);

    const employee = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true },
    });

    if (!employee) return formError("That employee could not be found.");

    const toDateTime = (value: string | undefined) => {
      if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
      return new Date(`${input.date}T${value}:00${BUSINESS_UTC_OFFSET}`);
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
