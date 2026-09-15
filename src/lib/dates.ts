import {
  differenceInCalendarDays,
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

/**
 * The company runs on Indian Standard Time. Anything that depends on "what
 * time is it" — today's date, check-in windows — is read in this zone, so a
 * server hosted elsewhere still agrees with the wall clock in Bengaluru.
 */
export const BUSINESS_TIMEZONE = "Asia/Kolkata";
/** IST has no daylight saving, so a fixed offset is safe for building instants. */
export const BUSINESS_UTC_OFFSET = "+05:30";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The wall clock in `BUSINESS_TIMEZONE` for an instant (default: now). */
export function businessClock(at: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Sunday = 0 … Saturday = 6 */
  weekday: number;
  /** Today at UTC midnight — the calendar-day key used throughout. */
  date: Date;
} {
  const parts = Object.fromEntries(
    clockFormat
      .formatToParts(at)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute", number>;

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return { ...parts, weekday: date.getUTCDay(), date };
}

/** Today at UTC midnight, for the company's calendar day. */
export function today(): Date {
  return businessClock().date;
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
  // Built in UTC directly: `eachDayOfInterval` steps in server-local time,
  // which on an IST server shifts every day back by one.
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, month - 1, index + 1)),
  );
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
