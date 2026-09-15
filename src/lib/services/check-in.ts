import "server-only";

import { checkInGate, type CheckInGate } from "@/lib/attendance-rules";
import { today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/** Whether self check-in is open right now, holidays included. */
export async function getCheckInGate(): Promise<CheckInGate> {
  const holiday = await prisma.holiday.findUnique({
    where: { date: today() },
    select: { name: true, date: true },
  });
  return checkInGate(holiday);
}
