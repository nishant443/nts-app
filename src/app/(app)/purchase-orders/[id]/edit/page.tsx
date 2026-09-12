import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PurchaseOrderFormPage } from "@/app/(app)/purchase-orders/po-form-page";
import { requireAdmin } from "@/lib/dal";
import { dayKey } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit purchase order",
};

export default async function EditPurchaseOrderPage(
  props: PageProps<"/purchase-orders/[id]/edit">,
) {
  await requireAdmin();

  const { id } = await props.params;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });

  if (!order) notFound();

  return (
    <PurchaseOrderFormPage
      heading={`Edit ${order.number}`}
      breadcrumbLabel={order.number}
      values={{
        id: order.id,
        customerId: order.vendorId,
        date: dayKey(order.date),
        secondaryDate: order.expectedDate ? dayKey(order.expectedDate) : "",
        status: order.status,
        subject: "",
        notes: order.notes ?? "",
        terms: order.terms ?? "",
        placeOfSupply: order.placeOfSupply ?? "",
        discountAmount: "0",
        items: order.items.map((item) => ({
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
