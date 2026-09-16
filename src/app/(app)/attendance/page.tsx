import type { Metadata } from "next";

import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { CheckInCard } from "@/components/attendance/check-in-card";
import { Card, CardHeader } from "@/components/ui/card";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/dal";
import { formatDuration, monthRange, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getCheckInGate } from "@/lib/services/check-in";
import { param, type SearchParams } from "@/lib/query";
import { getAttendanceMonth, resolveMonth } from "@/lib/services/attendance";

export const metadata: Metadata = {
  title: "My attendance",
};

export default async function AttendancePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const { month, year } = resolveMonth(
    param(searchParams, "month"),
    param(searchParams, "year"),
  );

  const now = today();
  const isCurrentMonth =
    month === now.getUTCMonth() + 1 && year === now.getUTCFullYear();

  const [{ days, summary }, todayRecord, gate] = await Promise.all([
    getAttendanceMonth(user.id, month, year),
    prisma.attendance.findUnique({
      where: { userId_date: { userId: user.id, date: now } },
      select: {
        status: true,
        checkInAt: true,
        checkOutAt: true,
        workedMinutes: true,
      },
    }),
    getCheckInGate(user.id),
  ]);

  const { from } = monthRange(month, year);

  return (
    <>
      <PageHeader
        title="My attendance"
        description="Your check-ins, leave and days off."
        actions={
          <MonthPicker month={month} year={year} basePath="/attendance" />
        }
      />

      {/* Check-in only makes sense while looking at the current month. */}
      {isCurrentMonth && (
        <CheckInCard
          status={todayRecord?.status ?? null}
          checkInAt={todayRecord?.checkInAt?.toISOString() ?? null}
          checkOutAt={todayRecord?.checkOutAt?.toISOString() ?? null}
          workedMinutes={todayRecord?.workedMinutes ?? 0}
          gate={gate}
        />
      )}

      <StatGrid>
        <StatCard
          label="Days present"
          value={summary.present}
          tone="success"
          hint={summary.halfDay > 0 ? `${summary.halfDay} half day(s)` : undefined}
        />
        <StatCard label="On leave" value={summary.onLeave} tone="accent" />
        <StatCard
          label="Absent"
          value={summary.absent}
          tone={summary.absent > 0 ? "danger" : "neutral"}
          hint={
            summary.notMarked > 0 ? `${summary.notMarked} not marked` : undefined
          }
        />
        <StatCard
          label="Hours worked"
          value={formatDuration(summary.workedMinutes)}
          tone="neutral"
        />
      </StatGrid>

      <Card>
        <CardHeader
          title={from.toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
          description={`${summary.weekOff} weekly off(s) · ${summary.holiday} holiday(s)`}
        />
        <AttendanceCalendar days={days} />
      </Card>
    </>
  );
}
