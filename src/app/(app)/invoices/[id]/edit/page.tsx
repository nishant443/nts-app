import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InvoiceFormPage } from "@/app/(app)/invoices/invoice-form-page";
import { requireAdmin } from "@/lib/dal";
import { dayKey } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit invoice",
};

export default async function EditInvoicePage(
  props: PageProps<"/invoices/[id]/edit">,
) {
  await requireAdmin();

  const { id } = await props.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!invoice) notFound();

  return (
    <InvoiceFormPage
      heading={`Edit ${invoice.number}`}
      breadcrumbLabel={invoice.number}
      quotationId={invoice.quotationId ?? undefined}
      values={{
        id: invoice.id,
        customerId: invoice.customerId,
        date: dayKey(invoice.date),
        secondaryDate: invoice.dueDate ? dayKey(invoice.dueDate) : "",
        poNumber: invoice.poNumber ?? "",
        poDate: invoice.poDate ? dayKey(invoice.poDate) : "",
        status: invoice.status === "DRAFT" ? "DRAFT" : "SENT",
        subject: invoice.subject ?? "",
        notes: invoice.notes ?? "",
        terms: invoice.terms ?? "",
        placeOfSupply: invoice.placeOfSupply ?? "",
        discountAmount: String(toMoney(invoice.discountAmount)),
        items: invoice.items.map((item) => ({
          description: item.description,
          hsnCode: item.hsnCode ?? "",
          quantity: String(toMoney(item.quantity)),
          unit: item.unit,
          unitPrice: String(toMoney(item.unitPrice)),
          taxRate: String(toMoney(item.taxRate)),
        })),
      }}
    />
  );
}
