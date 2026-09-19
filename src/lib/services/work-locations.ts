import "server-only";

import type { Geofence } from "@/lib/attendance-rules";
import { today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

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
