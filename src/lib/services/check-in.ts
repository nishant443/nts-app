import "server-only";

import { checkInGate, type CheckInGate } from "@/lib/attendance-rules";
import { today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getEffectiveLocation } from "@/lib/services/work-locations";

export async function getCheckInGate(userId: string): Promise<CheckInGate> {
  const day = today();
  const [holiday, fence] = await Promise.all([
    prisma.holiday.findUnique({
      where: { date: day },
      select: { name: true, date: true },
    }),
    getEffectiveLocation(userId, day),
  ]);
  return checkInGate(holiday, fence);
}
