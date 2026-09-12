import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { round2, toMoney } from "@/lib/money";
import { DocumentPdf, loadPdfAssets } from "@/lib/pdf/document-pdf";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

/**
 * Builds the quotation and invoice PDFs.
 *
 * Shared by the download routes and the email action so a customer who receives
 * the attachment and a colleague who downloads it are looking at byte-identical
 * documents.
 */

export interface BuiltDocument {
  buffer: Buffer;
  filename: string;
  number: string;
  total: number;
  customerName: string;
  customerEmail: string | null;
  dueLabel?: string;
  dueValue?: string;
}

/** Slashes in document numbers would otherwise create directories. */
function toFilename(number: string): string {
  return `${number.replace(/[/\\]/g, "-")}.pdf`;
}

export async function buildQuotationPdf(id: string): Promise<BuiltDocument> {
  const [quotation, settings, assets] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, items: { orderBy: { position: "asc" } } },
    }),
    getCompanySettings(),
    loadPdfAssets(),
  ]);

  if (!quotation) throw new NotFoundError("That quotation no longer exists.");

  const buffer = await renderToBuffer(
    DocumentPdf({
      title: "Quotation",
      number: quotation.number,
      date: formatDate(quotation.date),
      secondaryLabel: "Valid until",
      secondaryValue: quotation.validUntil
        ? formatDate(quotation.validUntil)
        : undefined,
      partyLabel: "Quotation for",
      party: quotation.customer,
      settings,
      subject: quotation.subject,
      notes: quotation.notes,
      terms: quotation.terms,
      placeOfSupply: quotation.placeOfSupply,
      lines: quotation.items.map((item) => ({
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: toMoney(item.quantity),
        unit: item.unit,
        unitPrice: toMoney(item.unitPrice),
        taxRate: toMoney(item.taxRate),
        lineTotal: toMoney(item.lineTotal),
      })),
      totals: {
        subtotal: toMoney(quotation.subtotal),
        discountAmount: toMoney(quotation.discountAmount),
        taxableAmount: toMoney(quotation.taxableAmount),
        cgstAmount: toMoney(quotation.cgstAmount),
        sgstAmount: toMoney(quotation.sgstAmount),
        igstAmount: toMoney(quotation.igstAmount),
        total: toMoney(quotation.total),
      },
      assets,
    }),
  );

  return {
    buffer,
    filename: toFilename(quotation.number),
    number: quotation.number,
    total: toMoney(quotation.total),
    customerName: quotation.customer.companyName ?? quotation.customer.name,
    customerEmail: quotation.customer.email,
    dueLabel: quotation.validUntil ? "Valid until" : undefined,
    dueValue: quotation.validUntil
      ? formatDate(quotation.validUntil)
      : undefined,
  };
}

export async function buildInvoicePdf(id: string): Promise<BuiltDocument> {
  const [invoice, settings, assets] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: { orderBy: { position: "asc" } } },
    }),
    getCompanySettings(),
    loadPdfAssets(),
  ]);

  if (!invoice) throw new NotFoundError("That invoice no longer exists.");

  const total = toMoney(invoice.total);
  const paid = toMoney(invoice.amountPaid);

  const buffer = await renderToBuffer(
    DocumentPdf({
      title: "Tax Invoice",
      number: invoice.number,
      date: formatDate(invoice.date),
      secondaryLabel: "Due",
      secondaryValue: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
      partyLabel: "Bill to",
      party: invoice.customer,
      settings,
      subject: invoice.subject,
      notes: invoice.notes,
      terms: invoice.terms,
      placeOfSupply: invoice.placeOfSupply,
      lines: invoice.items.map((item) => ({
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: toMoney(item.quantity),
        unit: item.unit,
        unitPrice: toMoney(item.unitPrice),
        taxRate: toMoney(item.taxRate),
        lineTotal: toMoney(item.lineTotal),
      })),
      totals: {
        subtotal: toMoney(invoice.subtotal),
        discountAmount: toMoney(invoice.discountAmount),
        taxableAmount: toMoney(invoice.taxableAmount),
        cgstAmount: toMoney(invoice.cgstAmount),
        sgstAmount: toMoney(invoice.sgstAmount),
        igstAmount: toMoney(invoice.igstAmount),
        total,
      },
      // Only worth printing once something has actually been paid.
      extraTotals:
        paid > 0.009
          ? [
              { label: "Amount received", value: paid },
              { label: "Balance due", value: round2(total - paid) },
            ]
          : undefined,
      assets,
    }),
  );

  return {
    buffer,
    filename: toFilename(invoice.number),
    number: invoice.number,
    total,
    customerName: invoice.customer.companyName ?? invoice.customer.name,
    customerEmail: invoice.customer.email,
    dueLabel: invoice.dueDate ? "Payment due" : undefined,
    dueValue: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
  };
}
