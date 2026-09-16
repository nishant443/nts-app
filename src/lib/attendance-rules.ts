import { businessClock, formatDate } from "@/lib/dates";

/**
 * When and where self check-in is allowed.
 *
 *   - not on Sundays, the weekly off
 *   - not on a declared holiday
 *   - only within a short radius of the employee's work location for the day
 *
 * The work location is set by an admin per employee; a day without its own
 * entry inherits the most recent earlier one (`lib/services/work-locations.ts`).
 * Admins can still correct the register by hand for any day.
 */

export const DEFAULT_CHECK_IN_RADIUS_M = 50;

/** Where an employee must be to check in, and how close counts. */
export interface Geofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  /** What the admin called the place — "BFW plant, Bengaluru". */
  label: string;
  /** The day the entry was recorded for; earlier than today when inherited. */
  date: Date;
}

/** A position as reported by the browser's Geolocation API. */
export interface Position {
  latitude: number;
  longitude: number;
  /** Reported accuracy in metres, when the device gives one. */
  accuracy?: number;
}

/** What the check-in button needs to know — coordinates stay on the server. */
export interface GateLocation {
  label: string;
  radiusMeters: number;
  /** ISO date the location was set for; null when it applies to today itself. */
  inheritedFrom: string | null;
}

export type CheckInGate = (
  | { open: true }
  | {
      open: false;
      reason: "sunday" | "holiday" | "no_location";
      message: string;
    }
) & { location: GateLocation | null };

export function checkInGate(
  holiday: { name: string; date: Date } | null,
  fence: Geofence | null,
  at: Date = new Date(),
): CheckInGate {
  const clock = businessClock(at);
  const location: GateLocation | null = fence
    ? {
        label: fence.label,
        radiusMeters: fence.radiusMeters,
        inheritedFrom:
          fence.date.getTime() < clock.date.getTime()
            ? fence.date.toISOString()
            : null,
      }
    : null;

  if (holiday) {
    return {
      open: false,
      location,
      reason: "holiday",
      message: `Today is a holiday — ${holiday.name} (${formatDate(holiday.date)}). No check-in needed.`,
    };
  }

  if (clock.weekday === 0) {
    return {
      open: false,
      location,
      reason: "sunday",
      message: "Sunday is the weekly off. Check-in opens again on Monday.",
    };
  }

  if (!fence) {
    return {
      open: false,
      location,
      reason: "no_location",
      message:
        "No work location has been set for you yet. Ask your admin to set one, then check in from there.",
    };
  }

  return { open: true, location };
}

// --- Distance -----------------------------------------------------------------

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
 * Is this position close enough to the work location? A missing position
 * fails closed — no location, no check-in — because the point of the fence is
 * that the button only works on site.
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
      message: `You are about ${formatDistance(distance)} from ${fence.label}. Check-in and check-out work only within ${fence.radiusMeters} m of it.`,
    };
  }

  return { ok: true, distance };
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`
    : `${meters} m`;
}
