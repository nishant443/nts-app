import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";

import { formatDate } from "@/lib/dates";
import { NotFoundError } from "@/lib/errors";
import { round2, toMoney } from "@/lib/money";
import { DocumentPdf, loadPdfAssets } from "@/lib/pdf/document-pdf";
import { TaxInvoicePdf } from "@/lib/pdf/tax-invoice-pdf";
import { prisma } from "@/lib/prisma";
import { getCompanySettings, type CompanyProfile } from "@/lib/settings";

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
    TaxInvoicePdf({
      number: invoice.number,
      date: formatDate(invoice.date),
      dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
      poNumber: invoice.poNumber,
      poDate: invoice.poDate ? formatDate(invoice.poDate) : undefined,
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
      amountPaid: paid,
      assets: {
        ...assets,
        upiQr: await upiQr(settings, invoice.number, round2(total - paid)),
      },
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

async function upiQr(
  settings: CompanyProfile,
  invoiceNumber: string,
  balance: number,
): Promise<Buffer | undefined> {
  if (!settings.upiId) return undefined;

  const params = new URLSearchParams({
    pa: settings.upiId,
    pn: settings.name,
    cu: "INR",
    tn: `Invoice ${invoiceNumber}`,
  });
  if (balance > 0) params.set("am", balance.toFixed(2));

  return QRCode.toBuffer(`upi://pay?${params.toString()}`, {
    type: "png",
    margin: 0,
    width: 256,
    errorCorrectionLevel: "M",
  });
}
