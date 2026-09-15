import { businessClock, formatDate } from "@/lib/dates";

/**
 * When self check-in is allowed.
 *
 *   - not before the working day starts (9:00 am IST)
 *   - not on Sundays, the weekly off
 *   - not on a declared holiday
 *
 * And, when the admin has set an office location, only from within a short
 * radius of it (see `Geofence` below).
 *
 * Admins can still correct the register by hand for any day.
 */

export const CHECK_IN_OPENS = { hour: 9, minute: 0 } as const;

export type CheckInGate = (
  | { open: true; opensAt: string }
  | {
      open: false;
      opensAt: string;
      reason: "before_hours" | "sunday" | "holiday";
      message: string;
    }
) & {
  /** Set when check-in must happen near the office; only the radius is shared with the browser. */
  geofence: { radiusMeters: number } | null;
};

function formatClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

export function checkInGate(
  holiday: { name: string; date: Date } | null,
  fence: Geofence | null = null,
  at: Date = new Date(),
): CheckInGate {
  const clock = businessClock(at);
  const opensAt = formatClock(CHECK_IN_OPENS.hour, CHECK_IN_OPENS.minute);
  const geofence = fence ? { radiusMeters: fence.radiusMeters } : null;

  if (holiday) {
    return {
      open: false,
      opensAt,
      geofence,
      reason: "holiday",
      message: `Today is a holiday — ${holiday.name} (${formatDate(holiday.date)}). No check-in needed.`,
    };
  }

  if (clock.weekday === 0) {
    return {
      open: false,
      opensAt,
      geofence,
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
      geofence,
      reason: "before_hours",
      message: `Check-in opens at ${opensAt}. It is ${formatClock(clock.hour, clock.minute)} now.`,
    };
  }

  return { open: true, opensAt, geofence };
}

// --- Where check-in is allowed ----------------------------------------------

/** Office point and the radius around it inside which check-in counts. */
export interface Geofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/** A position as reported by the browser's Geolocation API. */
export interface Position {
  latitude: number;
  longitude: number;
  /** Reported accuracy in metres, when the device gives one. */
  accuracy?: number;
}

export const DEFAULT_CHECK_IN_RADIUS_M = 30;

/**
 * Great-circle distance between two points in metres (haversine). Accurate to
 * well under a metre at the distances that matter here.
 */
export function distanceMeters(a: Position, b: Position): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type GeofenceCheck =
  | { ok: true; distance: number }
  | { ok: false; distance: number | null; message: string };

/**
 * Is this position close enough to the office? A missing position fails
 * closed — no location, no check-in — because the point of the fence is that
 * the button only works on site.
 */
export function checkGeofence(
  fence: Geofence,
  position: Position | null | undefined,
): GeofenceCheck {
  if (!position) {
    return {
      ok: false,
      distance: null,
      message:
        "Your location is needed to check in. Allow location access in your browser and try again.",
    };
  }

  const distance = Math.round(distanceMeters(fence, position));
  if (distance > fence.radiusMeters) {
    return {
      ok: false,
      distance,
      message: `You are about ${formatDistance(distance)} from the office. Check-in and check-out work only within ${fence.radiusMeters} m of it.`,
    };
  }

  return { ok: true, distance };
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`
    : `${meters} m`;
}
