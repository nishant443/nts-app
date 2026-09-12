import type { Metadata } from "next";

import { QuotationFormPage } from "@/app/(app)/quotations/quotation-form-page";
import { EMPTY_LINE } from "@/components/documents/line-items-editor";
import { requireUser } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";
import { param, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "New quotation",
};

export default async function NewQuotationPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();

  const searchParams = await props.searchParams;

  // Arriving from a customer page pre-selects that customer.
  const customerId = param(searchParams, "customerId") ?? "";

  const start = today();
  const validUntil = new Date(start);
  validUntil.setUTCDate(validUntil.getUTCDate() + 30);

  return (
    <QuotationFormPage
      heading="New quotation"
      breadcrumbLabel="New"
      values={{
        customerId,
        date: dayKey(start),
        secondaryDate: dayKey(validUntil),
        status: "DRAFT",
        subject: "",
        notes: "",
        terms:
          "Payment: 50% advance, balance on completion.\nDelivery: 2–3 weeks from receipt of order.\nWarranty: 6 months on workmanship.",
        placeOfSupply: "",
        discountAmount: "0",
        items: [{ ...EMPTY_LINE }],
      }}
    />
  );
}
