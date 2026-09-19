import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WorkLogForm } from "@/components/work/work-log-form";
import { PageHeader } from "@/components/ui/page-header";
import { assertOwnerOrAdmin, requireUser } from "@/lib/dal";
import { dayKey, formatDate } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit work report",
};

export default async function EditWorkLogPage(
  props: PageProps<"/work-logs/[id]/edit">,
) {
  const user = await requireUser();
  const { id } = await props.params;

  const [log, customers] = await Promise.all([
    prisma.dailyWorkLog.findUnique({ where: { id } }),
    prisma.customer.findMany({
      where: { type: { not: "VENDOR" } },
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyName: true },
    }),
  ]);

  if (!log) notFound();

  assertOwnerOrAdmin(user, log.userId);

  if (log.status === "APPROVED" && user.role !== "ADMIN") {
    redirect(`/work-logs/${log.id}`);
  }

  return (
    <>
      <PageHeader
        title="Edit work report"
        description={formatDate(log.date)}
        breadcrumbs={[
          { label: "My work", href: "/work-logs" },
          { label: formatDate(log.date), href: `/work-logs/${log.id}` },
          { label: "Edit" },
        ]}
      />

      <WorkLogForm
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
        }))}
        values={{
          id: log.id,
          date: dayKey(log.date),
          title: log.title,
          description: log.description,
          hoursSpent: String(toMoney(log.hoursSpent)),
          customerId: log.customerId ?? "",
        }}
      />
    </>
  );
}
