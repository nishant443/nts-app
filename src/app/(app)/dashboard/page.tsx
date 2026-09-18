import type { Metadata } from "next";

import { AdminDashboardView } from "@/app/(app)/dashboard/admin-dashboard";
import { EmployeeDashboardView } from "@/app/(app)/dashboard/employee-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { businessClock, formatDate, today } from "@/lib/dates";
import {
  getAdminDashboard,
  getEmployeeDashboard,
} from "@/lib/services/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Read off the Indian clock, not the server's — this renders on Vercel (UTC). */
function greeting(): string {
  const { hour } = businessClock();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();

  // The role decides which aggregate is even computed — an employee's request
  // never runs the company-wide revenue queries.
  const isAdmin = user.role === "ADMIN";
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          isAdmin
            ? `Here is where the business stands on ${formatDate(today())}.`
            : `Your work and attendance for ${formatDate(today())}.`
        }
      />

      {isAdmin ? (
        <AdminDashboardView data={await getAdminDashboard()} />
      ) : (
        <EmployeeDashboardView data={await getEmployeeDashboard(user)} />
      )}
    </>
  );
}
