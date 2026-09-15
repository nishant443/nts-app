import "server-only";

import { checkInGate, type CheckInGate } from "@/lib/attendance-rules";
import { today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getGeofence } from "@/lib/settings";

/** Whether self check-in is open right now, holidays and office fence included. */
export async function getCheckInGate(): Promise<CheckInGate> {
  const [holiday, fence] = await Promise.all([
    prisma.holiday.findUnique({
      where: { date: today() },
      select: { name: true, date: true },
    }),
    getGeofence(),
  ]);
  return checkInGate(holiday, fence);
}
