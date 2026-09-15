import type { Metadata } from "next";
import Link from "next/link";

import { CheckInLog } from "@/components/attendance/check-in-log";
import { MarkAttendanceForm } from "@/components/attendance/mark-attendance-form";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/dal";
import {
  dayKey,
  daysInMonth,
  formatDuration,
  formatTime,
  isWeekOff,
  monthRange,
  parseDateInput,
  today,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { param, type SearchParams } from "@/lib/query";
import { resolveMonth } from "@/lib/services/attendance";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Attendance register",
};

const CELL: Record<string, { className: string; letter: string }> = {
  PRESENT: { className: "bg-success-soft text-success", letter: "P" },
  HALF_DAY: { className: "bg-warning-soft text-warning", letter: "½" },
  ABSENT: { className: "bg-danger-soft text-danger", letter: "A" },
  ON_LEAVE: { className: "bg-info-soft text-info", letter: "L" },
  HOLIDAY: { className: "bg-accent-soft text-accent", letter: "H" },
  WEEK_OFF: { className: "bg-surface-inset text-fg-subtle", letter: "—" },
};

export default async function AttendanceRegisterPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const { month, year } = resolveMonth(
    param(searchParams, "month"),
    param(searchParams, "year"),
  );

  const { from, to } = monthRange(month, year);
  const now = today();

  // The check-in log shows one day in full; defaults to today, never later.
  const requestedDay = param(searchParams, "day");
  let logDay = now;
  if (requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay)) {
    const parsed = parseDateInput(requestedDay);
    if (parsed <= now) logDay = parsed;
  }

  const [employees, records, holidays, logRecords, logHoliday] =
    await Promise.all([
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        orderBy: { employeeCode: "asc" },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          avatarUrl: true,
        },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: from, lte: to } },
        select: {
          userId: true,
          date: true,
          status: true,
          workedMinutes: true,
          checkInAt: true,
          checkOutAt: true,
        },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: from, lte: to } },
        select: { date: true, name: true },
      }),
      prisma.attendance.findMany({
        where: { date: logDay },
        select: {
          userId: true,
          status: true,
          checkInAt: true,
          checkOutAt: true,
          workedMinutes: true,
          source: true,
          notes: true,
          checkInDistanceM: true,
          checkOutDistanceM: true,
        },
      }),
      prisma.holiday.findUnique({
        where: { date: logDay },
        select: { name: true },
      }),
    ]);

  const logByUser = new Map(
    logRecords.map((record) => [record.userId, record]),
  );
  const logRows = employees.map((employee) => {
    const record = logByUser.get(employee.id);
    return {
      employee,
      status: record?.status ?? null,
      checkInAt: record?.checkInAt ?? null,
      checkOutAt: record?.checkOutAt ?? null,
      workedMinutes: record?.workedMinutes ?? 0,
      source: record?.source ?? null,
      notes: record?.notes ?? null,
      checkInDistanceM: record?.checkInDistanceM ?? null,
      checkOutDistanceM: record?.checkOutDistanceM ?? null,
    };
  });

  const days = daysInMonth(month, year);
  const holidayKeys = new Map(
    holidays.map((holiday) => [dayKey(holiday.date), holiday.name]),
  );

  // Keyed lookup so the grid below is a plain O(1) read per cell.
  const byUserDay = new Map<
    string,
    {
      status: string;
      workedMinutes: number;
      checkInAt: Date | null;
      checkOutAt: Date | null;
    }
  >();
  for (const record of records) {
    byUserDay.set(`${record.userId}:${dayKey(record.date)}`, {
      status: record.status,
      workedMinutes: record.workedMinutes,
      checkInAt: record.checkInAt,
      checkOutAt: record.checkOutAt,
    });
  }

  const resolve = (userId: string, date: Date) => {
    const key = dayKey(date);
    const record = byUserDay.get(`${userId}:${key}`);
    if (record) return record.status;
    if (holidayKeys.has(key)) return "HOLIDAY";
    if (isWeekOff(date)) return "WEEK_OFF";
    return null;
  };

  const summary = employees.map((employee) => {
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let onLeave = 0;
    let minutes = 0;

    for (const date of days) {
      if (date > now) continue;
      const status = resolve(employee.id, date);
      if (status === "PRESENT") present += 1;
      else if (status === "HALF_DAY") halfDay += 1;
      else if (status === "ABSENT") absent += 1;
      else if (status === "ON_LEAVE") onLeave += 1;

      minutes +=
        byUserDay.get(`${employee.id}:${dayKey(date)}`)?.workedMinutes ?? 0;
    }

    return { employee, present, halfDay, absent, onLeave, minutes };
  });

  const totals = summary.reduce(
    (sum, row) => ({
      present: sum.present + row.present,
      absent: sum.absent + row.absent,
      onLeave: sum.onLeave + row.onLeave,
      minutes: sum.minutes + row.minutes,
    }),
    { present: 0, absent: 0, onLeave: 0, minutes: 0 },
  );

  return (
    <>
      <PageHeader
        title="Attendance register"
        description="Everyone's month at a glance. Click a name to see their calendar."
        breadcrumbs={[{ label: "Administration" }, { label: "Attendance" }]}
        actions={
          <MonthPicker month={month} year={year} basePath="/admin/attendance" />
        }
      />

      <StatGrid className="lg:grid-cols-4">
        <StatCard label="Days present" value={totals.present} tone="success" />
        <StatCard label="On leave" value={totals.onLeave} tone="accent" />
        <StatCard
          label="Absent"
          value={totals.absent}
          tone={totals.absent > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Hours worked"
          value={formatDuration(totals.minutes)}
          tone="neutral"
        />
      </StatGrid>

      <CheckInLog
        day={logDay}
        today={now}
        holiday={logHoliday?.name ?? null}
        rows={logRows}
        basePath="/admin/attendance"
      />

      <MarkAttendanceForm
        employees={employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
        }))}
        defaultDate={dayKey(now)}
      />

      <Card>
        <CardHeader
          title="Register"
          description="P present · ½ half day · A absent · L leave · H holiday"
        />

        {employees.length === 0 ? (
          <EmptyState
            title="No active employees"
            description="Add employees to start tracking attendance."
            action={{ label: "Add employee", href: "/admin/employees/new" }}
          />
        ) : (
          // The grid is wider than a phone; it scrolls inside this container
          // rather than making the page scroll sideways.
          <div className="scroll-x">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle"
                  >
                    Employee
                  </th>
                  {days.map((date) => (
                    <th
                      key={dayKey(date)}
                      scope="col"
                      title={holidayKeys.get(dayKey(date))}
                      className={cn(
                        "tnum w-8 px-0 py-2.5 text-center text-[11px] font-semibold",
                        isWeekOff(date) || holidayKeys.has(dayKey(date))
                          ? "text-fg-subtle"
                          : "text-fg-muted",
                      )}
                    >
                      {date.getUTCDate()}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle"
                  >
                    P / A / L
                  </th>
                </tr>
              </thead>

              <tbody>
                {summary.map((row) => (
                  <tr
                    key={row.employee.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2">
                      <Link
                        href={`/admin/employees/${row.employee.id}`}
                        className="flex items-center gap-2.5 whitespace-nowrap"
                      >
                        <Avatar
                          name={row.employee.name}
                          src={row.employee.avatarUrl}
                          size="sm"
                        />
                        <span className="text-[13px] font-medium text-fg hover:text-accent">
                          {row.employee.name}
                        </span>
                      </Link>
                    </td>

                    {days.map((date) => {
                      const status = resolve(row.employee.id, date);
                      const style = status ? CELL[status] : undefined;
                      const future = date > now;
                      const record = byUserDay.get(
                        `${row.employee.id}:${dayKey(date)}`,
                      );
                      const times = record?.checkInAt
                        ? ` · in ${formatTime(record.checkInAt)}${record.checkOutAt ? `, out ${formatTime(record.checkOutAt)}` : ""}`
                        : "";

                      return (
                        <td
                          key={dayKey(date)}
                          className="px-0 py-2 text-center"
                        >
                          <span
                            title={`${row.employee.name} — ${dayKey(date)}: ${status?.toLowerCase().replace("_", " ") ?? "not marked"}${times}`}
                            className={cn(
                              "mx-auto flex size-6 items-center justify-center rounded text-[10.5px] font-semibold",
                              style?.className ??
                                (future
                                  ? "text-fg-subtle"
                                  : "bg-surface-inset text-fg-subtle"),
                            )}
                          >
                            {style?.letter ?? (future ? "" : "·")}
                          </span>
                        </td>
                      );
                    })}

                    <td className="tnum whitespace-nowrap px-4 py-2 text-right text-[12.5px]">
                      <span className="font-semibold text-success">
                        {row.present + row.halfDay * 0.5}
                      </span>
                      <span className="text-fg-subtle"> / </span>
                      <span className="font-semibold text-danger">
                        {row.absent}
                      </span>
                      <span className="text-fg-subtle"> / </span>
                      <span className="font-semibold text-info">
                        {row.onLeave}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
