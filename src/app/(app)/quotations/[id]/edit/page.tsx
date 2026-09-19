import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QuotationFormPage } from "@/app/(app)/quotations/quotation-form-page";
import { requireUser } from "@/lib/dal";
import { dayKey } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit quotation",
};

export default async function EditQuotationPage(
  props: PageProps<"/quotations/[id]/edit">,
) {
  await requireUser();

  const { id } = await props.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!quotation) notFound();

  if (quotation.status === "CONVERTED") {
    redirect(`/quotations/${quotation.id}`);
  }

  return (
    <QuotationFormPage
      heading={`Edit ${quotation.number}`}
      breadcrumbLabel={quotation.number}
      values={{
        id: quotation.id,
        customerId: quotation.customerId,
        date: dayKey(quotation.date),
        secondaryDate: quotation.validUntil ? dayKey(quotation.validUntil) : "",
        status: quotation.status,
        subject: quotation.subject ?? "",
        notes: quotation.notes ?? "",
        terms: quotation.terms ?? "",
        placeOfSupply: quotation.placeOfSupply ?? "",
        discountAmount: String(toMoney(quotation.discountAmount)),
        items: quotation.items.map((item) => ({
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
