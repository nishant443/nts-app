import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ExpenseForm } from "@/components/expenses/expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { assertOwnerOrAdmin, requireUser } from "@/lib/dal";
import { dayKey, formatDate } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit expense",
};

export default async function EditExpensePage(
  props: PageProps<"/expenses/[id]/edit">,
) {
  const user = await requireUser();
  const { id } = await props.params;

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) notFound();

  assertOwnerOrAdmin(user, expense.userId);

  // Once reviewed, the claim is part of the payroll record.
  if (expense.status !== "PENDING" && user.role !== "ADMIN") {
    redirect("/expenses");
  }

  const workLogs = await prisma.dailyWorkLog.findMany({
    where: { userId: expense.userId },
    orderBy: { date: "desc" },
    take: 40,
    select: { id: true, title: true, date: true },
  });

  return (
    <>
      <PageHeader
        title="Edit expense"
        description={formatDate(expense.date)}
        breadcrumbs={[
          { label: "My expenses", href: "/expenses" },
          { label: "Edit" },
        ]}
      />

      <ExpenseForm
        workLogs={workLogs.map((log) => ({
          id: log.id,
          label: `${formatDate(log.date)} — ${log.title}`,
        }))}
        values={{
          id: expense.id,
          date: dayKey(expense.date),
          category: expense.category,
          amount: String(toMoney(expense.amount)),
          description: expense.description,
          workLogId: expense.workLogId ?? "",
          receiptUrl: expense.receiptUrl ?? "",
        }}
      />
    </>
  );
}
