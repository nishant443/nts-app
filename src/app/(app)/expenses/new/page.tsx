import type { Metadata } from "next";

import { ExpenseForm } from "@/components/expenses/expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { dayKey, formatDate, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { param, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Add expense",
};

export default async function NewExpensePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  // Only the employee's own recent reports can be linked.
  const workLogs = await prisma.dailyWorkLog.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 40,
    select: { id: true, title: true, date: true },
  });

  return (
    <>
      <PageHeader
        title="Add expense"
        description="Claim back travel, fuel and other out-of-pocket costs."
        breadcrumbs={[
          { label: "My expenses", href: "/expenses" },
          { label: "Add" },
        ]}
      />

      <ExpenseForm
        workLogs={workLogs.map((log) => ({
          id: log.id,
          label: `${formatDate(log.date)} — ${log.title}`,
        }))}
        values={{
          date: dayKey(today()),
          category: "TRAVEL",
          amount: "",
          description: "",
          workLogId: param(searchParams, "workLogId") ?? "",
          receiptUrl: "",
        }}
      />
    </>
  );
}
