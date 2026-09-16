import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, MapPinOff } from "lucide-react";

import { WorkLocationEmailButton } from "@/components/attendance/work-location-email-button";
import { WorkLocationForm } from "@/components/attendance/work-location-form";
import { WorkLocationHistory } from "@/components/attendance/work-location-history";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { dayKey, formatDate, formatDateTime, today } from "@/lib/dates";
import { isMailConfigured } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { param, type SearchParams } from "@/lib/query";
import { getEffectiveLocations } from "@/lib/services/work-locations";

export const metadata: Metadata = {
  title: "Work locations",
};

/**
 * Where every employee is expected to check in from today, and the form to
 * change it. A row marked "since <date>" is inheriting an earlier entry —
 * nothing was set for today itself.
 */
export default async function WorkLocationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const now = today();

  const [employees, effective, history] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { employeeCode: "asc" },
      select: { id: true, name: true, employeeCode: true, avatarUrl: true },
    }),
    getEffectiveLocations(now),
    prisma.workLocation.findMany({
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        date: true,
        label: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        user: { select: { name: true } },
        setBy: { select: { name: true } },
      },
    }),
  ]);

  const todayKey = dayKey(now);
  const mailConfigured = isMailConfigured();
  const withoutLocation = employees.filter((e) => !effective.has(e.id)).length;

  return (
    <>
      <PageHeader
        title="Work locations"
        description="Where each employee checks in from. Set it when the site changes; days in between inherit the last entry."
      />

      <WorkLocationForm
        employees={employees.map(({ id, name }) => ({ id, name }))}
        defaultDate={todayKey}
        defaultUserId={param(params, "employee")}
        mailConfigured={mailConfigured}
      />

      <Card>
        <CardHeader
          title={`Locations in force today · ${formatDate(now)}`}
          description={
            withoutLocation > 0
              ? `${withoutLocation} employee${withoutLocation === 1 ? " has" : "s have"} no location yet and cannot check in.`
              : "Every active employee has a location."
          }
        />
        <div className="scroll-x">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-[11.5px] font-semibold uppercase tracking-wide text-fg-subtle">
                <th scope="col" className="px-4 py-2.5 text-left sm:px-5">
                  Employee
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  Location
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  Coordinates
                </th>
                <th scope="col" className="px-4 py-2.5 text-right">
                  Radius
                </th>
                <th scope="col" className="px-4 py-2.5 text-left">
                  Applies
                </th>
                <th scope="col" className="px-4 py-2.5 text-left sm:px-5">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const location = effective.get(employee.id);
                const setToday = location && dayKey(location.date) === todayKey;
                return (
                  <tr
                    key={employee.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-4 py-2.5 sm:px-5">
                      <Link
                        href={`/admin/locations?employee=${employee.id}`}
                        className="flex items-center gap-2.5 whitespace-nowrap"
                      >
                        <Avatar
                          name={employee.name}
                          src={employee.avatarUrl}
                          size="sm"
                        />
                        <span>
                          <span className="block text-[13.5px] font-medium text-fg hover:text-accent">
                            {employee.name}
                          </span>
                          <span className="block text-[12px] text-fg-subtle">
                            {employee.employeeCode}
                          </span>
                        </span>
                      </Link>
                    </td>
                    {location ? (
                      <>
                        <td className="px-4 py-2.5 text-[13.5px] font-medium text-fg">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin
                              aria-hidden="true"
                              className="size-3.5 shrink-0 text-accent"
                            />
                            {location.label}
                          </span>
                        </td>
                        <td className="tnum whitespace-nowrap px-4 py-2.5 text-[12.5px] text-fg-muted">
                          <a
                            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-accent hover:underline"
                          >
                            {location.latitude.toFixed(5)},{" "}
                            {location.longitude.toFixed(5)}
                          </a>
                        </td>
                        <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-fg">
                          {location.radiusMeters} m
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px]">
                          {setToday ? (
                            <span className="font-medium text-success">
                              Set for today
                            </span>
                          ) : (
                            <span className="text-fg-muted">
                              Since {formatDate(location.date)}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 sm:px-5">
                          <div className="flex items-center gap-2">
                            <WorkLocationEmailButton
                              id={location.id}
                              employeeName={employee.name}
                              configured={mailConfigured}
                            />
                            <span className="text-[12px] text-fg-subtle">
                              {location.emailedAt
                                ? `Sent ${formatDateTime(location.emailedAt)}`
                                : "Not emailed"}
                            </span>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={5}
                        className="px-4 py-2.5 text-[13px] text-warning sm:px-5"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <MapPinOff aria-hidden="true" className="size-3.5" />
                          No location set — cannot check in
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Recent entries"
          description="Newest first. Removing an entry makes the days it covered fall back to the one before it."
        />
        {history.length === 0 ? (
          <EmptyState
            icon={<MapPin />}
            title="No locations recorded yet"
            description="Set an employee's location above and it will appear here."
          />
        ) : (
          <WorkLocationHistory
            rows={history.map((row) => ({
              id: row.id,
              date: row.date.toISOString(),
              employeeName: row.user.name,
              label: row.label,
              latitude: row.latitude,
              longitude: row.longitude,
              radiusMeters: row.radiusMeters,
              setByName: row.setBy.name,
            }))}
          />
        )}
      </Card>
    </>
  );
}
