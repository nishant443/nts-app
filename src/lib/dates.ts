import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";

/**
 * Calendar days are stored at UTC midnight so an attendance record for the 3rd
 * is the 3rd regardless of the server's timezone. Always build day keys with
 * `toDayStart` / `dayKey` rather than `new Date(...)` directly.
 */
export function toDayStart(value: Date | string): Date {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Today at UTC midnight, derived from the local calendar date. */
export function today(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

/**
 * Parse a `yyyy-MM-dd` form value into a UTC-midnight Date. Plain
 * `new Date("2026-09-11")` already parses as UTC, but form inputs and query
 * strings also arrive as full ISO strings, so normalise both.
 */
export function parseDateInput(value: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = dateOnly ? new Date(`${value}T00:00:00.000Z`) : parseISO(value);
  if (!isValid(parsed)) {
    throw new Error(`Invalid date: ${value}`);
  }
  return dateOnly ? parsed : toDayStart(parsed);
}

/** `yyyy-MM-dd` in UTC — the value shape for `<input type="date">`. */
export function dayKey(value: Date | string): string {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  return date.toISOString().slice(0, 10);
}

// --- Display -----------------------------------------------------------------

/** "11 Sep 2026" */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return "—";
  return format(date, "dd MMM yyyy");
}

/** "11 Sep 2026, 4:05 pm" */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return "—";
  return format(date, "dd MMM yyyy, h:mm a");
}

/** "4:05 pm" */
export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return "—";
  return format(date, "h:mm a");
}

/** "September 2026" */
export function formatMonthYear(month: number, year: number): string {
  return format(new Date(Date.UTC(year, month - 1, 1)), "MMMM yyyy");
}

/** "just now" / "3h ago" / "11 Sep 2026" — for activity feeds. */
export function formatRelative(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return "—";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
}

/** Minutes -> "7h 30m", for attendance and work-log durations. */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// --- Ranges ------------------------------------------------------------------

export type DateRange = { from: Date; to: Date };

/** Full UTC month range for a 1-indexed month. */
export function monthRange(month: number, year: number): DateRange {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from, to };
}

/** Every calendar day in a month, at UTC midnight. */
export function daysInMonth(month: number, year: number): Date[] {
  const { from, to } = monthRange(month, year);
  return eachDayOfInterval({ start: from, end: to }).map(toDayStart);
}

/** Sunday = 0, Saturday = 6 (UTC). */
export function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

/** NTS works a six-day week; Sunday is the weekly off. */
export function isWeekOff(date: Date): boolean {
  return weekdayOf(date) === 0;
}

export function countDaysInclusive(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1;
}

/**
 * Indian financial year label for a date: April–March.
 * 11 Sep 2026 -> "26-27". Used in invoice and quotation numbers.
 */
export function financialYearLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed; April = 3
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

/** Start and end of the financial year containing `date`. */
export function financialYearRange(date: Date): DateRange {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const startYear = month >= 3 ? year : year - 1;
  return {
    from: new Date(Date.UTC(startYear, 3, 1)),
    to: new Date(Date.UTC(startYear + 1, 2, 31)),
  };
}

/** The last `count` months as {month, year}, oldest first — for trend charts. */
export function recentMonths(
  count: number,
  reference = new Date(),
): { month: number; year: number; label: string }[] {
  const months: { month: number; year: number; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - i, 1),
    );
    months.push({
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
      label: format(date, "MMM"),
    });
  }
  return months;
}

export { startOfMonth, endOfMonth };
