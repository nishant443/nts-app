import type { Metadata } from "next";

import { ExpenseForm } from "@/components/expenses/expense-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { param, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Add expense",
};

export default async function NewExpensePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const searchParams = await props.searchParams;

  const customers = await prisma.customer.findMany({
    where: { type: { not: "VENDOR" } },
    orderBy: [{ companyName: "asc" }, { name: "asc" }],
    select: { id: true, name: true, companyName: true },
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
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
        }))}
        values={{
          date: param(searchParams, "date") ?? dayKey(today()),
          description: "",
          customerId: param(searchParams, "customerId") ?? "",
          receiptUrl: "",
          items: [],
        }}
      />
    </>
  );
}
