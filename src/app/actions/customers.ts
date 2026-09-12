"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation";

/**
 * Customer actions.
 *
 * Both roles may add a customer — engineers meet prospects on site and should
 * be able to capture them. Editing and deleting are admin-only, so a record
 * cannot be quietly altered after quotations have been raised against it.
 */

export const saveCustomer = formAction(
  { access: "user", schema: customerSchema },
  async ({ input, user }) => {
    const isUpdate = Boolean(input.id);

    if (isUpdate && user.role !== "ADMIN") {
      return formError("Only an administrator can edit a customer record.");
    }

    const data = {
      name: input.name,
      companyName: input.companyName ?? null,
      type: input.type,
      email: input.email ?? null,
      phone: input.phone ?? null,
      altPhone: input.altPhone ?? null,
      website: input.website ?? null,
      gstin: input.gstin ?? null,
      pan: input.pan ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? "India",
      notes: input.notes ?? null,
      ownerId: input.ownerId ?? null,
    };

    let customerId: string;

    if (isUpdate) {
      const existing = await prisma.customer.findUnique({
        where: { id: input.id! },
        select: { id: true },
      });
      if (!existing) throw new NotFoundError("That customer no longer exists.");

      await prisma.customer.update({ where: { id: input.id! }, data });
      customerId = input.id!;
    } else {
      const created = await prisma.customer.create({
        data: { ...data, createdById: user.id },
        select: { id: true },
      });
      customerId = created.id;
    }

    await recordAudit({
      userId: user.id,
      action: isUpdate ? "customer.updated" : "customer.created",
      entity: "Customer",
      entityId: customerId,
      meta: { name: input.name, company: input.companyName },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);

    redirect(`/customers/${customerId}`);
  },
);

/**
 * Deleting is blocked once a customer has any financial history — removing
 * them would orphan invoices and break the audit trail. Mark them Inactive
 * instead.
 */
export const deleteCustomer = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            invoices: true,
            quotations: true,
            payments: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!customer) throw new NotFoundError("That customer no longer exists.");

    const linked =
      customer._count.invoices +
      customer._count.quotations +
      customer._count.payments +
      customer._count.purchaseOrders;

    if (linked > 0) {
      throw new ConflictError(
        "This customer has quotations, invoices or payments against them. Set their status to Inactive instead of deleting.",
      );
    }

    await prisma.customer.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "customer.deleted",
      entity: "Customer",
      entityId: input.id,
      meta: { name: customer.name },
    });

    revalidatePath("/customers");
  },
);
