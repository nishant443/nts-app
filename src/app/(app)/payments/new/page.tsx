import type { Metadata } from "next";

import { PaymentForm } from "@/components/payments/payment-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { param, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Record payment",
};

export default async function NewPaymentPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const invoiceId = param(searchParams, "invoiceId") ?? "";

  const [customers, openInvoices] = await Promise.all([
    prisma.customer.findMany({
      where: { type: { not: "VENDOR" } },
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyName: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        customerId: true,
        total: true,
        amountPaid: true,
        dueDate: true,
      },
    }),
  ]);

  const invoices = openInvoices
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customerId: invoice.customerId,
      balance: round2(toMoney(invoice.total) - toMoney(invoice.amountPaid)),
      dueDate: invoice.dueDate ? dayKey(invoice.dueDate) : null,
    }))
    .filter((invoice) => invoice.balance > 0.009);

  const preselected = invoices.find((invoice) => invoice.id === invoiceId);

  return (
    <>
      <PageHeader
        title="Record payment"
        description="Log money received against an invoice, or as an on-account receipt."
        breadcrumbs={[
          { label: "Payments", href: "/payments" },
          { label: "Record" },
        ]}
      />

      <PaymentForm
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
        }))}
        invoices={invoices}
        initial={{
          customerId: preselected?.customerId ?? "",
          invoiceId: preselected?.id ?? "",
          date: dayKey(today()),
          amount: preselected ? preselected.balance.toFixed(2) : "",
          mode: "NEFT",
          status: "RECEIVED",
          reference: "",
          notes: "",
        }}
      />
    </>
  );
}
