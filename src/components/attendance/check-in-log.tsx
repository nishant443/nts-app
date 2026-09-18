import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDistance } from "@/lib/attendance-rules";
import {
  dayKey,
  formatDate,
  formatDuration,
  formatTime,
  isWeekOff,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface CheckInLogRow {
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    avatarUrl: string | null;
  };
  status: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workedMinutes: number;
  source: string | null;
  notes: string | null;
  /** Metres from the day's work location at check-in / check-out; null for admin-entered rows. */
  checkInDistanceM: number | null;
  checkOutDistanceM: number | null;
}

/**
 * One day's check-ins and check-outs for every active employee, exactly as
 * recorded — the times the register grid summarises into a single letter.
 */
export function CheckInLog({
  day,
  today,
  holiday,
  rows,
  basePath,
}: {
  day: Date;
  today: Date;
  holiday: string | null;
  rows: CheckInLogRow[];
  basePath: string;
}) {
  const shift = (days: number) => {
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + days);
    return `${basePath}?day=${dayKey(next)}`;
  };

  const isToday = dayKey(day) === dayKey(today);
  const offDay = holiday ?? (isWeekOff(day) ? "Sunday — weekly off" : null);
  const checkedIn = rows.filter((row) => row.checkInAt).length;
  const stillIn = rows.filter((row) => row.checkInAt && !row.checkOutAt).length;

  return (
    <Card>
      <CardHeader
        title={
          isToday ? "Today's check-ins" : `Check-ins on ${formatDate(day)}`
        }
        description={
          offDay
            ? `${offDay}. Self check-in is closed.`
            : `${checkedIn} of ${rows.length} checked in${stillIn > 0 ? ` · ${stillIn} still in` : ""}`
        }
        action={
          <div className="flex items-center gap-1">
            <Button
              href={shift(-1)}
              variant="ghost"
              size="sm"
              aria-label="Previous day"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="tnum min-w-[7.5rem] text-center text-[13px] font-medium text-fg">
              {formatDate(day)}
            </span>
            <Button
              href={shift(1)}
              variant="ghost"
              size="sm"
              aria-label="Next day"
              aria-disabled={day >= today || undefined}
              className={cn(day >= today && "pointer-events-none opacity-40")}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {!isToday && (
              <Button href={basePath} variant="secondary" size="sm">
                Today
              </Button>
            )}
          </div>
        }
      />

      <div className="scroll-x">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
              <th scope="col" className="px-4 py-2.5 text-left sm:px-5">
                Employee
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                Check in
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                Check out
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Hours
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                Distance from site
              </th>
              <th scope="col" className="px-4 py-2.5 text-left">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 text-left sm:px-5">
                Recorded by
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.employee.id}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-4 py-2.5 sm:px-5">
                  <Link
                    href={`/admin/employees/${row.employee.id}`}
                    className="flex items-center gap-2.5 whitespace-nowrap"
                  >
                    <Avatar
                      name={row.employee.name}
                      src={row.employee.avatarUrl}
                      size="sm"
                    />
                    <span>
                      <span className="block text-[13.5px] font-medium text-fg hover:text-accent">
                        {row.employee.name}
                      </span>
                      <span className="block text-[12px] text-fg-subtle">
                        {row.employee.employeeCode}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="tnum whitespace-nowrap px-4 py-2.5 text-[13.5px]">
                  {row.checkInAt ? (
                    <span className="font-medium text-fg">
                      {formatTime(row.checkInAt)}
                    </span>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </td>
                <td className="tnum whitespace-nowrap px-4 py-2.5 text-[13.5px]">
                  {row.checkOutAt ? (
                    <span className="font-medium text-fg">
                      {formatTime(row.checkOutAt)}
                    </span>
                  ) : row.checkInAt ? (
                    <span className="text-success">Still in</span>
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </td>
                <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13.5px] text-fg">
                  {formatDuration(row.workedMinutes)}
                </td>
                <td className="tnum px-4 py-2.5 text-[12.5px] leading-relaxed text-fg-muted">
                  {row.checkInDistanceM === null &&
                  row.checkOutDistanceM === null ? (
                    <span className="text-fg-subtle">—</span>
                  ) : (
                    <>
                      {row.checkInDistanceM !== null && (
                        <span
                          title={`${row.checkInDistanceM} metres from the work location when checking in`}
                        >
                          {formatDistance(row.checkInDistanceM)} away at
                          check-in
                        </span>
                      )}
                      {row.checkInDistanceM !== null &&
                        row.checkOutDistanceM !== null && <br />}
                      {row.checkOutDistanceM !== null && (
                        <span
                          title={`${row.checkOutDistanceM} metres from the work location when checking out`}
                        >
                          {formatDistance(row.checkOutDistanceM)} away at
                          check-out
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {row.status ? (
                    <StatusBadge status={row.status} />
                  ) : (
                    <span className="text-[12.5px] text-fg-subtle">
                      {offDay ? "Off" : "Not marked"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[12.5px] text-fg-muted sm:px-5">
                  {row.source === "MANUAL"
                    ? "Admin"
                    : row.source === "SELF_CHECK_IN"
                      ? "Employee"
                      : row.source
                        ? row.source.toLowerCase().replace(/_/g, " ")
                        : "—"}
                  {row.notes && (
                    <span
                      className="block max-w-[16rem] truncate text-fg-subtle"
                      title={row.notes}
                    >
                      {row.notes}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
