import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import {
  deletePurchaseOrder,
  setPurchaseOrderStatus,
} from "@/app/actions/purchase-orders";
import { ConfirmAction } from "@/components/documents/confirm-action";
import { DocumentView } from "@/components/documents/document-view";
import { StatusActions } from "@/components/documents/status-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export async function generateMetadata(
  props: PageProps<"/purchase-orders/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: order?.number ?? "Purchase order" };
}

export default async function PurchaseOrderDetailPage(
  props: PageProps<"/purchase-orders/[id]">,
) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const { id } = await props.params;

  const [order, settings] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: { select: { name: true } },
        items: { orderBy: { position: "asc" } },
      },
    }),
    getCompanySettings(),
  ]);

  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={order.number}
        description={`${order.vendor.companyName ?? order.vendor.name} · ${formatDate(order.date)}`}
        breadcrumbs={[
          { label: "Purchase orders", href: "/purchase-orders" },
          { label: order.number },
        ]}
        actions={
          isAdmin ? (
            <>
              <Button
                href={`/purchase-orders/${order.id}/edit`}
                variant="secondary"
              >
                <Pencil aria-hidden="true" />
                Edit
              </Button>

              {order.status === "DRAFT" && (
                <ConfirmAction
                  action={deletePurchaseOrder}
                  input={{ id: order.id }}
                  title="Delete this draft?"
                  body="The order and its line items will be removed. This cannot be undone."
                  confirmLabel="Delete"
                  variant="danger"
                  successMessage="Purchase order deleted."
                  redirectTo="/purchase-orders"
                  trigger={
                    <>
                      <Trash2 aria-hidden="true" />
                      Delete
                    </>
                  }
                />
              )}
            </>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge status={order.status} />

        {isAdmin && (
          <StatusActions
            id={order.id}
            current={order.status}
            onChange={setPurchaseOrderStatus}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "SENT", label: "Sent" },
              { value: "PARTIALLY_RECEIVED", label: "Part received" },
              { value: "RECEIVED", label: "Received" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
        )}

        {order.expectedDate && (
          <span className="text-[13px] text-fg-muted">
            Expected{" "}
            <span className="text-fg">{formatDate(order.expectedDate)}</span>
          </span>
        )}

        <span className="text-[13px] text-fg-muted">
          Raised by <span className="text-fg">{order.createdBy.name}</span>
        </span>
      </div>

      <DocumentView
        party={order.vendor}
        partyLabel="Order to"
        settings={settings}
        notes={order.notes}
        terms={order.terms}
        placeOfSupply={order.placeOfSupply}
        showAmountInWords={false}
        lines={order.items.map((item) => ({
          id: item.id,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: toMoney(item.quantity),
          unit: item.unit,
          unitPrice: toMoney(item.unitPrice),
          taxRate: toMoney(item.taxRate),
          lineTotal: toMoney(item.lineTotal),
        }))}
        totals={{
          subtotal: toMoney(order.subtotal),
          discountAmount: 0,
          taxableAmount: toMoney(order.taxableAmount),
          cgstAmount: toMoney(order.cgstAmount),
          sgstAmount: toMoney(order.sgstAmount),
          igstAmount: toMoney(order.igstAmount),
          total: toMoney(order.total),
        }}
      />
    </>
  );
}
