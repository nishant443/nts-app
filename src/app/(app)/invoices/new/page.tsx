import type { Metadata } from "next";

import { InvoiceFormPage } from "@/app/(app)/invoices/invoice-form-page";
import { EMPTY_LINE } from "@/components/documents/line-items-editor";
import { requireAdmin } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { param, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "New invoice",
};

export default async function NewInvoicePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const customerId = param(searchParams, "customerId") ?? "";

  const start = today();
  const due = new Date(start);
  due.setUTCDate(due.getUTCDate() + 30);

  return (
    <InvoiceFormPage
      heading="New invoice"
      breadcrumbLabel="New"
      values={{
        customerId,
        date: dayKey(start),
        secondaryDate: dayKey(due),
        status: "DRAFT",
        subject: "",
        notes: "",
        terms:
          "Payment due within 30 days.\nInterest at 18% p.a. is chargeable on delayed payments.\nGoods once sold will not be taken back.",
        placeOfSupply: "",
        discountAmount: "0",
        items: [{ ...EMPTY_LINE }],
      }}
    />
  );
}
