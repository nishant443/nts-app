"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { withLineItems } from "@/lib/line-items";
import { withDocumentNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { prepareDocument } from "@/lib/services/documents";
import { getCompanySettings } from "@/lib/settings";
import type { PurchaseOrderStatus } from "@/generated/prisma/enums";
import { purchaseOrderSchema } from "@/lib/validation";

/**
 * Purchase orders — what NTS buys in, raised against a customer record marked
 * as a vendor.
 */
export const savePurchaseOrder = formAction(
  { access: "admin", schema: purchaseOrderSchema, transform: withLineItems },
  async ({ input, user }) => {
    const settings = await getCompanySettings();

    const vendor = await prisma.customer.findUnique({
      where: { id: input.vendorId },
      select: { id: true, state: true, companyName: true, name: true },
    });

    if (!vendor) {
      return formError("Select a vendor for this purchase order.", {
        vendorId: ["Select a vendor."],
      });
    }

    const prepared = prepareDocument({
      date: input.date,
      placeOfSupply: input.placeOfSupply,
      items: input.items,
      settings,
      customerState: vendor.state,
    });

    const shared = {
      vendorId: vendor.id,
      date: prepared.date,
      expectedDate: input.expectedDate
        ? parseDateInput(input.expectedDate)
        : null,
      status: input.status,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      placeOfSupply: prepared.placeOfSupply,
      subtotal: prepared.subtotal,
      taxableAmount: prepared.taxableAmount,
      cgstAmount: prepared.cgstAmount,
      sgstAmount: prepared.sgstAmount,
      igstAmount: prepared.igstAmount,
      total: prepared.total,
    };

    const orderId = await prisma.$transaction(async (tx) => {
      if (input.id) {
        const existing = await tx.purchaseOrder.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        if (!existing) {
          throw new NotFoundError("That purchase order no longer exists.");
        }

        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: input.id },
        });
        await tx.purchaseOrder.update({
          where: { id: input.id },
          data: { ...shared, items: { create: prepared.items } },
        });

        return input.id;
      }

      return withDocumentNumber(
        tx,
        "purchaseOrder",
        prepared.date,
        settings.purchaseOrderPrefix,
        async (number) => {
          const created = await tx.purchaseOrder.create({
            data: {
              ...shared,
              number,
              createdById: user.id,
              items: { create: prepared.items },
            },
            select: { id: true },
          });
          return created.id;
        },
      );
    });

    await recordAudit({
      userId: user.id,
      action: input.id ? "purchase_order.updated" : "purchase_order.created",
      entity: "PurchaseOrder",
      entityId: orderId,
      meta: { total: prepared.total, vendor: vendor.companyName },
    });

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${orderId}`);

    await flash(input.id ? "Purchase order saved." : "Purchase order created.");
    redirect(`/purchase-orders/${orderId}`);
  },
);

export const setPurchaseOrderStatus = action<{ id: string; status: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const allowed = [
      "DRAFT",
      "SENT",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED",
    ] as const;

    if (!(allowed as readonly string[]).includes(input.status)) {
      throw new ConflictError("That is not a valid purchase order status.");
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: input.id },
      select: { id: true, status: true },
    });

    if (!order) throw new NotFoundError("That purchase order no longer exists.");

    await prisma.purchaseOrder.update({
      where: { id: input.id },
      data: { status: input.status as PurchaseOrderStatus },
    });

    await recordAudit({
      userId: user.id,
      action: "purchase_order.status_changed",
      entity: "PurchaseOrder",
      entityId: input.id,
      meta: { from: order.status, to: input.status },
    });

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${input.id}`);
  },
);

export const deletePurchaseOrder = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: input.id },
      select: { number: true, status: true },
    });

    if (!order) throw new NotFoundError("That purchase order no longer exists.");

    if (order.status !== "DRAFT") {
      throw new ConflictError(
        "Only a draft purchase order can be deleted. Cancel this one instead.",
      );
    }

    await prisma.purchaseOrder.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "purchase_order.deleted",
      entity: "PurchaseOrder",
      entityId: input.id,
      meta: { number: order.number },
    });

    revalidatePath("/purchase-orders");
  },
);
