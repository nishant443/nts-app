import type { Metadata } from "next";

import { PurchaseOrderFormPage } from "@/app/(app)/purchase-orders/po-form-page";
import { EMPTY_LINE } from "@/components/documents/line-items-editor";
import { requireAdmin } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";

export const metadata: Metadata = {
  title: "New purchase order",
};

export default async function NewPurchaseOrderPage() {
  await requireAdmin();

  const start = today();
  const expected = new Date(start);
  expected.setUTCDate(expected.getUTCDate() + 14);

  return (
    <PurchaseOrderFormPage
      heading="New purchase order"
      breadcrumbLabel="New"
      values={{
        customerId: "",
        date: dayKey(start),
        secondaryDate: dayKey(expected),
        status: "DRAFT",
        subject: "",
        notes: "",
        terms: "Please quote our PO number on the invoice and delivery note.",
        placeOfSupply: "",
        discountAmount: "0",
        items: [{ ...EMPTY_LINE }],
      }}
    />
  );
}
