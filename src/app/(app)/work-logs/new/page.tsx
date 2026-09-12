import type { Metadata } from "next";

import { WorkLogForm } from "@/components/work/work-log-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Log work",
};

export default async function NewWorkLogPage() {
  await requireUser();

  const customers = await prisma.customer.findMany({
    where: { type: { not: "VENDOR" } },
    orderBy: [{ companyName: "asc" }, { name: "asc" }],
    select: { id: true, name: true, companyName: true },
  });

  return (
    <>
      <PageHeader
        title="Log work"
        description="Record what you did today. It goes to your administrator for review."
        breadcrumbs={[{ label: "My work", href: "/work-logs" }, { label: "New" }]}
      />

      <WorkLogForm
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
        }))}
        values={{
          date: dayKey(today()),
          title: "",
          description: "",
          hoursSpent: "8",
          customerId: "",
        }}
      />
    </>
  );
}
