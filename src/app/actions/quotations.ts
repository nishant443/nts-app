"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { withLineItems } from "@/lib/line-items";
import { notifyAdmins } from "@/lib/notifications";
import { withDocumentNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { prepareDocument } from "@/lib/services/documents";
import { getCompanySettings } from "@/lib/settings";
import { quotationSchema } from "@/lib/validation";

/**
 * Quotation actions.
 *
 * The form posts line items as parallel arrays, so `withLineItems` reshapes the
 * payload before validation. Totals are always recomputed server-side.
 */
export const saveQuotation = formAction(
  {
    access: "user",
    schema: quotationSchema,
    // The raw FormData is reshaped before the schema runs.
    transform: withLineItems,
  },
  async ({ input, user }) => {
    const settings = await getCompanySettings();

    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, state: true, companyName: true, name: true },
    });

    if (!customer) {
      return formError("Select a customer for this quotation.", {
        customerId: ["Select a customer."],
      });
    }

    const prepared = prepareDocument({
      date: input.date,
      placeOfSupply: input.placeOfSupply,
      discountAmount: input.discountAmount,
      items: input.items,
      settings,
      customerState: customer.state,
    });

    const shared = {
      customerId: customer.id,
      date: prepared.date,
      validUntil: input.validUntil ? parseDateInput(input.validUntil) : null,
      status: input.status,
      subject: input.subject ?? null,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      placeOfSupply: prepared.placeOfSupply,
      subtotal: prepared.subtotal,
      discountAmount: prepared.discountAmount,
      taxableAmount: prepared.taxableAmount,
      cgstAmount: prepared.cgstAmount,
      sgstAmount: prepared.sgstAmount,
      igstAmount: prepared.igstAmount,
      total: prepared.total,
    };

    const quotationId = await prisma.$transaction(async (tx) => {
      if (input.id) {
        const existing = await tx.quotation.findUnique({
          where: { id: input.id },
          select: { id: true, status: true },
        });
        if (!existing) throw new NotFoundError("That quotation no longer exists.");

        if (existing.status === "CONVERTED") {
          throw new ConflictError(
            "This quotation has been converted to an invoice and can no longer be edited.",
          );
        }

        // Replacing the lines wholesale is simpler and safer than diffing, and
        // line items carry no identity of their own.
        await tx.quotationItem.deleteMany({ where: { quotationId: input.id } });
        await tx.quotation.update({
          where: { id: input.id },
          data: { ...shared, items: { create: prepared.items } },
        });

        return input.id;
      }

      return withDocumentNumber(
        tx,
        "quotation",
        prepared.date,
        settings.quotationPrefix,
        async (number) => {
          const created = await tx.quotation.create({
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
      action: input.id ? "quotation.updated" : "quotation.created",
      entity: "Quotation",
      entityId: quotationId,
      meta: { total: prepared.total, customer: customer.companyName },
    });

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);

    redirect(`/quotations/${quotationId}`);
  },
);

export const setQuotationStatus = action<{ id: string; status: string }>(
  { access: "user" },
  async ({ input, user }) => {
    const allowed = [
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
    ] as const;

    if (!(allowed as readonly string[]).includes(input.status)) {
      throw new ConflictError("That is not a valid quotation status.");
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        number: true,
        status: true,
        customer: { select: { companyName: true, name: true } },
      },
    });

    if (!quotation) throw new NotFoundError("That quotation no longer exists.");

    if (quotation.status === "CONVERTED") {
      throw new ConflictError(
        "This quotation has already been converted to an invoice.",
      );
    }

    await prisma.quotation.update({
      where: { id: input.id },
      data: { status: input.status as (typeof allowed)[number] },
    });

    if (input.status === "ACCEPTED") {
      await notifyAdmins({
        type: "QUOTATION_ACCEPTED",
        title: `Quotation ${quotation.number} accepted`,
        body: `${quotation.customer.companyName ?? quotation.customer.name} accepted the quotation. Raise an invoice when the work is done.`,
        link: `/quotations/${quotation.id}`,
      });
    }

    await recordAudit({
      userId: user.id,
      action: "quotation.status_changed",
      entity: "Quotation",
      entityId: input.id,
      meta: { from: quotation.status, to: input.status },
    });

    revalidatePath("/quotations");
    revalidatePath(`/quotations/${input.id}`);
  },
);

/**
 * Turn an accepted quotation into an invoice, copying the lines across. The
 * quotation is marked CONVERTED so it cannot be double-billed.
 */
export const convertQuotationToInvoice = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const settings = await getCompanySettings();

    const invoiceId = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id: input.id },
        include: { items: { orderBy: { position: "asc" } } },
      });

      if (!quotation) throw new NotFoundError("That quotation no longer exists.");
      if (quotation.status === "CONVERTED") {
        throw new ConflictError(
          "This quotation has already been converted to an invoice.",
        );
      }

      const date = new Date();
      const dueDate = new Date(date);
      dueDate.setUTCDate(dueDate.getUTCDate() + 30);

      const created = await withDocumentNumber(
        tx,
        "invoice",
        date,
        settings.invoicesPrefix,
        async (number) =>
          tx.invoice.create({
            data: {
              number,
              customerId: quotation.customerId,
              quotationId: quotation.id,
              date,
              dueDate,
              status: "DRAFT",
              subject: quotation.subject,
              notes: quotation.notes,
              terms: quotation.terms,
              placeOfSupply: quotation.placeOfSupply,
              subtotal: quotation.subtotal,
              discountAmount: quotation.discountAmount,
              taxableAmount: quotation.taxableAmount,
              cgstAmount: quotation.cgstAmount,
              sgstAmount: quotation.sgstAmount,
              igstAmount: quotation.igstAmount,
              total: quotation.total,
              createdById: user.id,
              items: {
                create: quotation.items.map((item) => ({
                  position: item.position,
                  description: item.description,
                  hsnCode: item.hsnCode,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice,
                  taxRate: item.taxRate,
                  lineTotal: item.lineTotal,
                })),
              },
            },
            select: { id: true },
          }),
      );

      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: "CONVERTED" },
      });

      return created.id;
    });

    await recordAudit({
      userId: user.id,
      action: "quotation.converted",
      entity: "Quotation",
      entityId: input.id,
      meta: { invoiceId },
    });

    revalidatePath("/quotations");
    revalidatePath("/invoices");

    redirect(`/invoices/${invoiceId}`);
  },
);

export const deleteQuotation = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const quotation = await prisma.quotation.findUnique({
      where: { id: input.id },
      select: { number: true, status: true, _count: { select: { invoices: true } } },
    });

    if (!quotation) throw new NotFoundError("That quotation no longer exists.");

    if (quotation._count.invoices > 0) {
      throw new ConflictError(
        "An invoice was raised from this quotation, so it cannot be deleted.",
      );
    }

    await prisma.quotation.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "quotation.deleted",
      entity: "Quotation",
      entityId: input.id,
      meta: { number: quotation.number },
    });

    revalidatePath("/quotations");
  },
);
