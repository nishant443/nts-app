import "server-only";

import type { CalendarDay } from "@/components/attendance/attendance-calendar";
import { dayKey, daysInMonth, isWeekOff, monthRange, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export async function getAttendanceMonth(
  userId: string,
  month: number,
  year: number,
): Promise<{
  days: CalendarDay[];
  summary: {
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    holiday: number;
    weekOff: number;
    notMarked: number;
    workedMinutes: number;
  };
}> {
  const { from, to } = monthRange(month, year);

  const [records, holidays] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, date: { gte: from, lte: to } },
      select: { date: true, status: true, workedMinutes: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true, name: true },
    }),
  ]);

  const byDate = new Map(
    records.map((record) => [dayKey(record.date), record]),
  );
  const holidayByDate = new Map(
    holidays.map((holiday) => [dayKey(holiday.date), holiday.name]),
  );

  const now = today();

  const summary = {
    present: 0,
    halfDay: 0,
    absent: 0,
    onLeave: 0,
    holiday: 0,
    weekOff: 0,
    notMarked: 0,
    workedMinutes: 0,
  };

  const days: CalendarDay[] = daysInMonth(month, year).map((date) => {
    const key = dayKey(date);
    const record = byDate.get(key);
    const holidayName = holidayByDate.get(key);
    const isFuture = date > now;

    const status =
      record?.status ??
      (holidayName ? "HOLIDAY" : isWeekOff(date) ? "WEEK_OFF" : null);

    if (status === "PRESENT") summary.present += 1;
    else if (status === "HALF_DAY") summary.halfDay += 1;
    else if (status === "ABSENT") summary.absent += 1;
    else if (status === "ON_LEAVE") summary.onLeave += 1;
    else if (status === "HOLIDAY") summary.holiday += 1;
    else if (status === "WEEK_OFF") summary.weekOff += 1;
    else if (!isFuture) summary.notMarked += 1;

    summary.workedMinutes += record?.workedMinutes ?? 0;

    return {
      date: key,
      dayOfMonth: date.getUTCDate(),
      weekday: date.getUTCDay(),
      status,
      workedMinutes: record?.workedMinutes ?? 0,
      isFuture,
      holidayName,
    };
  });

  return { days, summary };
}

export function resolveMonth(
  monthParam?: string,
  yearParam?: string,
): { month: number; year: number } {
  const now = today();

  const month = Number(monthParam);
  const year = Number(yearParam);

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : now.getUTCMonth() + 1,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : now.getUTCFullYear(),
  };
}
