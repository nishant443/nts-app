import { z } from "zod";

import { errorResponse, parseQuery } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { formatMonthYear, today } from "@/lib/dates";
import {
  buildWorkbook,
  sheet,
  spreadsheetHeaders,
  type SheetColumn,
} from "@/lib/excel";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import {
  getAttendanceReport,
  type AttendanceReportRow,
} from "@/lib/services/reports";

export const runtime = "nodejs";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

/** Monthly attendance summary per employee. */
export async function GET(request: Request) {
  try {
    const user = await requireApiAdmin();
    enforceRateLimit(
      `export:${user.id}`,
      RateLimits.export.limit,
      RateLimits.export.windowSeconds,
    );

    const query = parseQuery(request, querySchema);
    const now = today();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();

    const rows = await getAttendanceReport(month, year);

    const columns: SheetColumn<AttendanceReportRow>[] = [
      { header: "Code", key: "employeeCode", width: 10, value: (r) => r.employeeCode },
      { header: "Employee", key: "name", width: 28, value: (r) => r.name },
      { header: "Present", key: "present", width: 11, value: (r) => r.present },
      { header: "Half days", key: "halfDay", width: 11, value: (r) => r.halfDay },
      { header: "Absent", key: "absent", width: 11, value: (r) => r.absent },
      { header: "On leave", key: "onLeave", width: 11, value: (r) => r.onLeave },
      {
        header: "Hours worked",
        key: "hours",
        width: 14,
        value: (r) => Math.round((r.workedMinutes / 60) * 10) / 10,
      },
    ];

    const sum = (pick: (row: AttendanceReportRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);

    const buffer = await buildWorkbook({
      title: `Attendance report — ${formatMonthYear(month, year)}`,
      subtitle: `Nutan Tech Solutions · ${rows.length} employees`,
      sheets: [
        sheet<AttendanceReportRow>({
          name: "Attendance",
          columns,
          rows,
          totals: {
            present: sum((r) => r.present),
            halfDay: sum((r) => r.halfDay),
            absent: sum((r) => r.absent),
            onLeave: sum((r) => r.onLeave),
            hours: Math.round((sum((r) => r.workedMinutes) / 60) * 10) / 10,
          },
        }),
      ],
    });

    return new Response(new Uint8Array(buffer), {
      headers: spreadsheetHeaders(
        `Attendance-${year}-${String(month).padStart(2, "0")}.xlsx`,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
