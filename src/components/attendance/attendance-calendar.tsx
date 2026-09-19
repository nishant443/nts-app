import { formatDuration } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  weekday: number;
  status: string | null;
  workedMinutes: number;
  isFuture: boolean;
  holidayName?: string;
}

const STATUS_STYLE: Record<string, { cell: string; letter: string }> = {
  PRESENT: { cell: "bg-success-soft text-success ring-success/25", letter: "P" },
  HALF_DAY: { cell: "bg-warning-soft text-warning ring-warning/25", letter: "½" },
  ABSENT: { cell: "bg-danger-soft text-danger ring-danger/25", letter: "A" },
  ON_LEAVE: { cell: "bg-info-soft text-info ring-info/25", letter: "L" },
  HOLIDAY: { cell: "bg-accent-soft text-accent ring-accent/25", letter: "H" },
  WEEK_OFF: { cell: "bg-surface-inset text-fg-subtle ring-border", letter: "—" },
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AttendanceCalendar({ days }: { days: CalendarDay[] }) {
  const columnFor = (weekday: number) => (weekday === 0 ? 7 : weekday);
  const leadingBlanks = days.length > 0 ? columnFor(days[0]!.weekday) - 1 : 0;

  return (
    <div className="p-4 sm:p-5">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-fg-subtle"
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.charAt(0)}</span>
          </div>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}

        {days.map((day) => {
          const style = day.status ? STATUS_STYLE[day.status] : undefined;
          const label = day.holidayName
            ? `${day.dayOfMonth}: ${day.holidayName}`
            : day.status
              ? `${day.dayOfMonth}: ${day.status.toLowerCase().replace("_", " ")}${
                  day.workedMinutes
                    ? `, ${formatDuration(day.workedMinutes)}`
                    : ""
                }`
              : `${day.dayOfMonth}: not marked`;

          return (
            <div
              key={day.date}
              title={label}
              aria-label={label}
              className={cn(
                "flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg text-center ring-1 ring-inset transition-colors",
                style?.cell ??
                  (day.isFuture
                    ? "bg-transparent text-fg-subtle ring-border/60"
                    : "bg-surface text-fg-subtle ring-border"),
              )}
            >
              <span className="tnum text-[12px] font-semibold leading-none sm:text-[13px]">
                {day.dayOfMonth}
              </span>
              <span
                aria-hidden="true"
                className="mt-0.5 text-[10px] font-medium leading-none opacity-80"
              >
                {style?.letter ?? (day.isFuture ? "" : "·")}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3.5 text-[12px] text-fg-muted">
        {Object.entries(STATUS_STYLE).map(([status, style]) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-4 items-center justify-center rounded text-[9px] font-semibold ring-1 ring-inset",
                style.cell,
              )}
            >
              {style.letter}
            </span>
            {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
