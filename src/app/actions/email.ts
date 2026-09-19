"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { action } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { AppError, ValidationError } from "@/lib/errors";
import { documentEmail, sendMail } from "@/lib/mail";
import { formatCurrency } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { RateLimits } from "@/lib/rate-limit";
import {
  buildInvoicePdf,
  buildQuotationPdf,
} from "@/lib/services/document-pdf-builder";
import { getCompanySettings } from "@/lib/settings";

const inputSchema = z.object({
  kind: z.enum(["quotation", "invoice"]),
  id: z.string().min(1),
  to: z.string().email().optional(),
});

export const emailDocument = action<
  { kind: "quotation" | "invoice"; id: string; to?: string },
  { sentTo: string }
>({ access: "admin", rateLimit: RateLimits.export }, async ({ input, user }) => {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("That request was not valid.");
  }

  const settings = await getCompanySettings();

  const document =
    parsed.data.kind === "quotation"
      ? await buildQuotationPdf(parsed.data.id)
      : await buildInvoicePdf(parsed.data.id);

  const to = parsed.data.to ?? document.customerEmail;

  if (!to) {
    throw new AppError(
      `${document.customerName} has no email address on file. Add one on the customer record, then try again.`,
      { status: 422, code: "no_recipient" },
    );
  }

  const kindLabel = parsed.data.kind === "quotation" ? "Quotation" : "Invoice";

  const { subject, text, html } = documentEmail({
    kind: kindLabel,
    number: document.number,
    customerName: document.customerName,
    companyName: settings.name,
    total: formatCurrency(document.total),
    dueLabel: document.dueLabel,
    dueValue: document.dueValue,
    senderName: user.name,
    senderPhone: settings.phone,
    senderEmail: settings.email,
  });

  await sendMail({
    to,
    subject,
    text,
    html,
    replyTo: user.email,
    attachments: [
      {
        filename: document.filename,
        content: document.buffer,
        contentType: "application/pdf",
      },
    ],
  });

  if (parsed.data.kind === "quotation") {
    await prisma.quotation.updateMany({
      where: { id: parsed.data.id, status: "DRAFT" },
      data: { status: "SENT" },
    });
    revalidatePath(`/quotations/${parsed.data.id}`);
    revalidatePath("/quotations");
  } else {
    await prisma.invoice.updateMany({
      where: { id: parsed.data.id, status: "DRAFT" },
      data: { status: "SENT" },
    });
    revalidatePath(`/invoices/${parsed.data.id}`);
    revalidatePath("/invoices");
  }

  await recordAudit({
    userId: user.id,
    action: `${parsed.data.kind}.emailed`,
    entity: parsed.data.kind === "quotation" ? "Quotation" : "Invoice",
    entityId: parsed.data.id,
    meta: { to, number: document.number },
  });

  return { sentTo: to };
});
