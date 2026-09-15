import { businessClock, formatDate } from "@/lib/dates";

/**
 * When self check-in is allowed.
 *
 *   - not before the working day starts (9:00 am IST)
 *   - not on Sundays, the weekly off
 *   - not on a declared holiday
 *
 * Admins can still correct the register by hand for any day.
 */

export const CHECK_IN_OPENS = { hour: 9, minute: 0 } as const;

export type CheckInGate =
  | { open: true; opensAt: string }
  | {
      open: false;
      opensAt: string;
      reason: "before_hours" | "sunday" | "holiday";
      message: string;
    };

function formatClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

export function checkInGate(
  holiday: { name: string; date: Date } | null,
  at: Date = new Date(),
): CheckInGate {
  const clock = businessClock(at);
  const opensAt = formatClock(CHECK_IN_OPENS.hour, CHECK_IN_OPENS.minute);

  if (holiday) {
    return {
      open: false,
      opensAt,
      reason: "holiday",
      message: `Today is a holiday — ${holiday.name} (${formatDate(holiday.date)}). No check-in needed.`,
    };
  }

  if (clock.weekday === 0) {
    return {
      open: false,
      opensAt,
      reason: "sunday",
      message: "Sunday is the weekly off. Check-in opens again on Monday.",
    };
  }

  const minutesNow = clock.hour * 60 + clock.minute;
  const minutesOpen = CHECK_IN_OPENS.hour * 60 + CHECK_IN_OPENS.minute;
  if (minutesNow < minutesOpen) {
    return {
      open: false,
      opensAt,
      reason: "before_hours",
      message: `Check-in opens at ${opensAt}. It is ${formatClock(clock.hour, clock.minute)} now.`,
    };
  }

  return { open: true, opensAt };
}
