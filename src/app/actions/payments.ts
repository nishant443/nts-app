"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { parseDateInput, today } from "@/lib/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { round2, toMoney } from "@/lib/money";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { deriveInvoiceStatus } from "@/lib/services/documents";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { paymentSchema } from "@/lib/validation";

/**
 * Payment actions.
 *
 * Recording a payment and updating the invoice it settles must happen together
 * — every write runs inside a transaction so `amountPaid` can never drift from
 * the sum of the payments behind it.
 */

/** Recomputes an invoice's paid total from its payments and restates status. */
async function syncInvoice(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  invoiceId: string,
) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, total: true, dueDate: true, status: true },
  });
  if (!invoice) return;

  const received = await tx.payment.aggregate({
    where: { invoiceId, status: "RECEIVED" },
    _sum: { amount: true },
  });

  const amountPaid = toMoney(received._sum.amount);

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid,
      status: deriveInvoiceStatus({
        current: invoice.status,
        total: toMoney(invoice.total),
        amountPaid,
        dueDate: invoice.dueDate,
        now: today(),
      }) as InvoiceStatus,
    },
  });
}

export const savePayment = formAction(
  { access: "admin", schema: paymentSchema },
  async ({ input, user }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { id: true, companyName: true, name: true },
    });

    if (!customer) {
      return formError("Select a customer for this payment.", {
        customerId: ["Select a customer."],
      });
    }

    // Guard against over-payment before writing anything.
    if (input.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        select: { id: true, customerId: true, total: true, number: true },
      });

      if (!invoice) {
        return formError("That invoice could not be found.", {
          invoiceId: ["Select a valid invoice."],
        });
      }

      if (invoice.customerId !== customer.id) {
        return formError("That invoice belongs to a different customer.", {
          invoiceId: ["This invoice is not for the selected customer."],
        });
      }

      const others = await prisma.payment.aggregate({
        where: {
          invoiceId: invoice.id,
          status: "RECEIVED",
          ...(input.id ? { NOT: { id: input.id } } : {}),
        },
        _sum: { amount: true },
      });

      const alreadyPaid = toMoney(others._sum.amount);
      const wouldBePaid =
        input.status === "RECEIVED" ? alreadyPaid + input.amount : alreadyPaid;

      if (wouldBePaid > toMoney(invoice.total) + 0.009) {
        const remaining = round2(toMoney(invoice.total) - alreadyPaid);
        return formError(
          `That is more than the balance on ${invoice.number}. At most ${remaining.toFixed(2)} can be recorded.`,
          { amount: [`Maximum ${remaining.toFixed(2)}`] },
        );
      }
    }

    const data = {
      customerId: customer.id,
      invoiceId: input.invoiceId ?? null,
      date: parseDateInput(input.date),
      amount: input.amount,
      mode: input.mode,
      status: input.status,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    };

    const paymentId = await prisma.$transaction(async (tx) => {
      let id: string;
      let previousInvoiceId: string | null = null;

      if (input.id) {
        const existing = await tx.payment.findUnique({
          where: { id: input.id },
          select: { id: true, invoiceId: true },
        });
        if (!existing) throw new NotFoundError("That payment no longer exists.");

        previousInvoiceId = existing.invoiceId;
        await tx.payment.update({ where: { id: input.id }, data });
        id = input.id;
      } else {
        const created = await tx.payment.create({
          data: { ...data, recordedById: user.id },
          select: { id: true },
        });
        id = created.id;
      }

      // Re-sync both sides when a payment is moved between invoices.
      if (previousInvoiceId && previousInvoiceId !== data.invoiceId) {
        await syncInvoice(tx, previousInvoiceId);
      }
      if (data.invoiceId) {
        await syncInvoice(tx, data.invoiceId);
      }

      return id;
    });

    if (input.status === "RECEIVED" && !input.id) {
      await notifyAdmins({
        type: "PAYMENT_RECEIVED",
        title: `Payment received from ${customer.companyName ?? customer.name}`,
        body: `${input.amount.toFixed(2)} recorded via ${input.mode}.`,
        link: `/payments`,
      });
    }

    await recordAudit({
      userId: user.id,
      action: input.id ? "payment.updated" : "payment.recorded",
      entity: "Payment",
      entityId: paymentId,
      meta: {
        amount: input.amount,
        mode: input.mode,
        invoiceId: input.invoiceId,
      },
    });

    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath("/dashboard");

    await flash("Payment recorded.");
    redirect("/payments");
  },
);

export const deletePayment = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const payment = await prisma.payment.findUnique({
      where: { id: input.id },
      select: { id: true, invoiceId: true, amount: true },
    });

    if (!payment) throw new NotFoundError("That payment no longer exists.");

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: input.id } });
      if (payment.invoiceId) await syncInvoice(tx, payment.invoiceId);
    });

    await recordAudit({
      userId: user.id,
      action: "payment.deleted",
      entity: "Payment",
      entityId: input.id,
      meta: { amount: toMoney(payment.amount) },
    });

    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
  },
);

/**
 * Flags invoices whose due date has passed. Called when the payments page is
 * viewed so the list is accurate without needing a scheduled job.
 */
export async function refreshOverdueInvoices(): Promise<void> {
  await prisma.invoice.updateMany({
    where: {
      dueDate: { lt: today() },
      status: { in: ["SENT", "PARTIALLY_PAID"] },
    },
    data: { status: "OVERDUE" },
  });
}

export const markPaymentReceived = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const payment = await prisma.payment.findUnique({
      where: { id: input.id },
      select: { id: true, status: true, invoiceId: true },
    });

    if (!payment) throw new NotFoundError("That payment no longer exists.");
    if (payment.status === "RECEIVED") {
      throw new ConflictError("This payment is already marked as received.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: input.id },
        data: { status: "RECEIVED" },
      });
      if (payment.invoiceId) await syncInvoice(tx, payment.invoiceId);
    });

    await recordAudit({
      userId: user.id,
      action: "payment.marked_received",
      entity: "Payment",
      entityId: input.id,
    });

    revalidatePath("/payments");
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
  },
);
