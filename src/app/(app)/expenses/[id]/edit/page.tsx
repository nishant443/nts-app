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

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!expense) notFound();

  assertOwnerOrAdmin(user, expense.userId);

  if (expense.status === "REIMBURSED" && user.role !== "ADMIN") {
    redirect("/expenses");
  }

  const customers = await prisma.customer.findMany({
    where: { type: { not: "VENDOR" } },
    orderBy: [{ companyName: "asc" }, { name: "asc" }],
    select: { id: true, name: true, companyName: true },
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
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
        }))}
        values={{
          id: expense.id,
          date: dayKey(expense.date),
          description: expense.description ?? "",
          customerId: expense.customerId ?? "",
          receiptUrl: expense.receiptUrl ?? "",
          items: expense.items.map((item) => ({
            category: item.category,
            amount: String(toMoney(item.amount)),
            distanceKm:
              item.distanceKm === null ? "" : String(toMoney(item.distanceKm)),
            foodType: item.foodType ?? "",
            note: item.note ?? "",
          })),
        }}
      />
    </>
  );
}
