import "server-only";

import type { Geofence } from "@/lib/attendance-rules";
import { today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/**
 * Work locations resolve by "latest entry on or before the day": an admin
 * records a location when it changes, and every following day inherits it
 * until a newer one is recorded. Entries dated in the future are ignored
 * until their day arrives, so tomorrow's site can be set up in advance.
 */

const geofenceSelect = {
  id: true,
  date: true,
  label: true,
  latitude: true,
  longitude: true,
  radiusMeters: true,
  emailedAt: true,
} as const;

export interface EffectiveLocation extends Geofence {
  id: string;
  emailedAt: Date | null;
}

/** The location that applies to one employee on `day` (default today). */
export async function getEffectiveLocation(
  userId: string,
  day: Date = today(),
): Promise<EffectiveLocation | null> {
  return prisma.workLocation.findFirst({
    where: { userId, date: { lte: day } },
    orderBy: { date: "desc" },
    select: geofenceSelect,
  });
}

/**
 * The location in force for every active employee on `day`, keyed by user id.
 * One query: the newest entry per employee on or before the day.
 */
export async function getEffectiveLocations(
  day: Date = today(),
): Promise<Map<string, EffectiveLocation>> {
  const rows = await prisma.workLocation.findMany({
    where: { date: { lte: day }, user: { status: "ACTIVE" } },
    orderBy: [{ userId: "asc" }, { date: "desc" }],
    distinct: ["userId"],
    select: { ...geofenceSelect, userId: true },
  });
  return new Map(rows.map(({ userId, ...location }) => [userId, location]));
}
