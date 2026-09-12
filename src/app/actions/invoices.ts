"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { parseDateInput, today } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { withLineItems } from "@/lib/line-items";
import { toMoney } from "@/lib/money";
import { withDocumentNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { deriveInvoiceStatus, prepareDocument } from "@/lib/services/documents";
import { getCompanySettings } from "@/lib/settings";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { invoiceSchema } from "@/lib/validation";

/**
 * Invoice actions.
 *
 * Raising and editing invoices is admin-only: an invoice is the legal record of
 * a sale, and `amountPaid` feeds every revenue figure in the app.
 */
export const saveInvoice = formAction(
  { access: "admin", schema: invoiceSchema, transform: withLineItems },
  async ({ input, user }) => {
    const settings = await getCompanySettings();

    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, state: true, companyName: true, name: true },
    });

    if (!customer) {
      return formError("Select a customer for this invoice.", {
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

    const dueDate = input.dueDate ? parseDateInput(input.dueDate) : null;

    const shared = {
      customerId: customer.id,
      quotationId: input.quotationId ?? null,
      date: prepared.date,
      dueDate,
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

    const invoiceId = await prisma.$transaction(async (tx) => {
      if (input.id) {
        const existing = await tx.invoice.findUnique({
          where: { id: input.id },
          select: { id: true, amountPaid: true, status: true },
        });
        if (!existing) throw new NotFoundError("That invoice no longer exists.");

        const amountPaid = toMoney(existing.amountPaid);

        // Editing an invoice below what has already been received would leave
        // a negative balance and corrupt the collection figures.
        if (prepared.total < amountPaid - 0.009) {
          throw new ConflictError(
            `This invoice already has ${amountPaid.toFixed(2)} recorded against it. The total cannot be reduced below that.`,
          );
        }

        await tx.invoiceItem.deleteMany({ where: { invoiceId: input.id } });
        await tx.invoice.update({
          where: { id: input.id },
          data: {
            ...shared,
            status: deriveInvoiceStatus({
              current: input.status,
              total: prepared.total,
              amountPaid,
              dueDate,
              now: today(),
            }) as InvoiceStatus,
            items: { create: prepared.items },
          },
        });

        return input.id;
      }

      return withDocumentNumber(
        tx,
        "invoice",
        prepared.date,
        settings.invoicesPrefix,
        async (number) => {
          const created = await tx.invoice.create({
            data: {
              ...shared,
              number,
              status: input.status,
              amountPaid: 0,
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
      action: input.id ? "invoice.updated" : "invoice.created",
      entity: "Invoice",
      entityId: invoiceId,
      meta: { total: prepared.total, customer: customer.companyName },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/dashboard");

    redirect(`/invoices/${invoiceId}`);
  },
);

export const setInvoiceStatus = action<{ id: string; status: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const allowed = ["DRAFT", "SENT", "CANCELLED"] as const;

    if (!(allowed as readonly string[]).includes(input.status)) {
      throw new ConflictError(
        "Paid and overdue statuses follow from recorded payments and cannot be set by hand.",
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: input.id },
      select: { id: true, number: true, status: true, amountPaid: true },
    });

    if (!invoice) throw new NotFoundError("That invoice no longer exists.");

    if (input.status === "CANCELLED" && toMoney(invoice.amountPaid) > 0.009) {
      throw new ConflictError(
        "Payments have been recorded against this invoice. Reverse them before cancelling it.",
      );
    }

    await prisma.invoice.update({
      where: { id: input.id },
      data: { status: input.status as InvoiceStatus },
    });

    await recordAudit({
      userId: user.id,
      action: "invoice.status_changed",
      entity: "Invoice",
      entityId: input.id,
      meta: { from: invoice.status, to: input.status },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${input.id}`);
    revalidatePath("/dashboard");
  },
);

export const deleteInvoice = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.id },
      select: {
        number: true,
        status: true,
        _count: { select: { payments: true } },
      },
    });

    if (!invoice) throw new NotFoundError("That invoice no longer exists.");

    if (invoice._count.payments > 0) {
      throw new ConflictError(
        "Payments are recorded against this invoice. Cancel it instead of deleting.",
      );
    }

    if (invoice.status !== "DRAFT") {
      throw new ConflictError(
        "Only a draft invoice can be deleted. Cancel this one instead so the number stays on record.",
      );
    }

    await prisma.invoice.delete({ where: { id: input.id } });

    await recordAudit({
      userId: user.id,
      action: "invoice.deleted",
      entity: "Invoice",
      entityId: input.id,
      meta: { number: invoice.number },
    });

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
  },
);
