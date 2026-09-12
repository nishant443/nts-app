import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import {
  HolidayList,
  HolidayManager,
} from "@/components/settings/holiday-manager";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Holidays",
};

export default async function HolidaysSettingsPage() {
  await requireAdmin();

  const now = today();
  const year = now.getUTCFullYear();

  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lte: new Date(Date.UTC(year + 1, 11, 31)),
      },
    },
    orderBy: { date: "asc" },
  });

  return (
    <>
      <HolidayManager defaultDate={dayKey(now)} />

      <Card>
        <CardHeader
          title="Holiday calendar"
          description="Declared holidays are excluded from working days, so they never count as loss of pay."
        />

        {holidays.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="No holidays declared"
            description="Add public holidays so attendance and payroll treat them correctly."
          />
        ) : (
          <HolidayList
            holidays={holidays.map((holiday) => ({
              id: holiday.id,
              date: holiday.date.toISOString(),
              name: holiday.name,
            }))}
          />
        )}
      </Card>
    </>
  );
}
