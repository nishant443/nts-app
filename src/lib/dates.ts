import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";

export function toDayStart(value: Date | string): Date {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export const BUSINESS_TIMEZONE = "Asia/Kolkata";
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

export function businessClock(at: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
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

export function today(): Date {
  return businessClock().date;
}

export function parseDateInput(value: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = dateOnly
    ? new Date(`${value}T00:00:00.000Z`)
    : parseISO(value);
  if (!isValid(parsed)) {
    throw new Error(`Invalid date: ${value}`);
  }
  return dateOnly ? parsed : toDayStart(parsed);
}

export function dayKey(value: Date | string): string {
  const date = typeof value === "string" ? parseDateInput(value) : value;
  return date.toISOString().slice(0, 10);
}

const displayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function displayParts(date: Date): {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  period: string;
} {
  const parts = Object.fromEntries(
    displayFormat.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    day: parts.day,
    month: parts.month.replace(/\./g, "").slice(0, 3),
    year: parts.year,
    hour: parts.hour,
    minute: parts.minute,
    period: parts.dayPeriod.toLowerCase().replace(/[\s.]/g, ""),
  };
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? date : null;
}

export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  const { day, month, year } = displayParts(date);
  return `${day} ${month} ${year}`;
}

export function formatDateTime(
  value: Date | string | null | undefined,
): string {
  const date = toDate(value);
  if (!date) return "—";
  const { day, month, year, hour, minute, period } = displayParts(date);
  return `${day} ${month} ${year}, ${hour}:${minute} ${period}`;
}

export function formatTime(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  const { hour, minute, period } = displayParts(date);
  return `${hour}:${minute} ${period}`;
}

export function formatMonthYear(month: number, year: number): string {
  return format(new Date(Date.UTC(year, month - 1, 1)), "MMMM yyyy");
}

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

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export type DateRange = { from: Date; to: Date };

export function monthRange(month: number, year: number): DateRange {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from, to };
}

export function daysInMonth(month: number, year: number): Date[] {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => new Date(Date.UTC(year, month - 1, index + 1)),
  );
}

export function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

export function isWeekOff(date: Date): boolean {
  return weekdayOf(date) === 0;
}

export function countDaysInclusive(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1;
}

export function financialYearLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

export function financialYearRange(date: Date): DateRange {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const startYear = month >= 3 ? year : year - 1;
  return {
    from: new Date(Date.UTC(startYear, 3, 1)),
    to: new Date(Date.UTC(startYear + 1, 2, 31)),
  };
}

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
