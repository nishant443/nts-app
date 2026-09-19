import { z } from "zod";

import { errorResponse, parseQuery } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import {
  buildWorkbook,
  sheet,
  spreadsheetHeaders,
  type SheetColumn,
} from "@/lib/excel";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import { round2, toMoney } from "@/lib/money";
import { defaultReportRange, getSalesReport } from "@/lib/services/reports";

export const runtime = "nodejs";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

interface InvoiceRow {
  number: string;
  date: string;
  customer: string;
  gstin: string;
  placeOfSupply: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  received: number;
  balance: number;
  status: string;
}

interface CustomerRow {
  customer: string;
  invoiceCount: number;
  invoiced: number;
  received: number;
  outstanding: number;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiAdmin();
    enforceRateLimit(
      `export:${user.id}`,
      RateLimits.export.limit,
      RateLimits.export.windowSeconds,
    );

    const query = parseQuery(request, querySchema);
    const fallback = defaultReportRange();

    const from = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : fallback.from;
    const to = query.to
      ? new Date(`${query.to}T23:59:59.999Z`)
      : fallback.to;

    const [report, invoices] = await Promise.all([
      getSalesReport(from, to),
      prisma.invoice.findMany({
        where: {
          status: { in: ["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] },
          date: { gte: from, lte: to },
        },
        orderBy: { date: "asc" },
        include: {
          customer: { select: { name: true, companyName: true, gstin: true } },
        },
      }),
    ]);

    const invoiceRows: InvoiceRow[] = invoices.map((invoice) => {
      const total = toMoney(invoice.total);
      const received = toMoney(invoice.amountPaid);

      return {
        number: invoice.number,
        date: formatDate(invoice.date),
        customer: invoice.customer.companyName ?? invoice.customer.name,
        gstin: invoice.customer.gstin ?? "",
        placeOfSupply: invoice.placeOfSupply ?? "",
        taxable: toMoney(invoice.taxableAmount),
        cgst: toMoney(invoice.cgstAmount),
        sgst: toMoney(invoice.sgstAmount),
        igst: toMoney(invoice.igstAmount),
        total,
        received,
        balance: round2(total - received),
        status: invoice.status,
      };
    });

    const invoiceColumns: SheetColumn<InvoiceRow>[] = [
      { header: "Invoice", key: "number", width: 20, value: (r) => r.number },
      { header: "Date", key: "date", width: 13, value: (r) => r.date },
      { header: "Customer", key: "customer", width: 32, value: (r) => r.customer },
      { header: "GSTIN", key: "gstin", width: 18, value: (r) => r.gstin },
      { header: "Place of supply", key: "placeOfSupply", width: 16, value: (r) => r.placeOfSupply },
      { header: "Taxable", key: "taxable", width: 14, money: true, value: (r) => r.taxable },
      { header: "CGST", key: "cgst", width: 12, money: true, value: (r) => r.cgst },
      { header: "SGST", key: "sgst", width: 12, money: true, value: (r) => r.sgst },
      { header: "IGST", key: "igst", width: 12, money: true, value: (r) => r.igst },
      { header: "Total", key: "total", width: 15, money: true, value: (r) => r.total },
      { header: "Received", key: "received", width: 14, money: true, value: (r) => r.received },
      { header: "Balance", key: "balance", width: 14, money: true, value: (r) => r.balance },
      { header: "Status", key: "status", width: 14, value: (r) => r.status },
    ];

    const customerColumns: SheetColumn<CustomerRow>[] = [
      { header: "Customer", key: "customer", width: 34, value: (r) => r.customer },
      { header: "Invoices", key: "invoiceCount", width: 11, value: (r) => r.invoiceCount },
      { header: "Invoiced", key: "invoiced", width: 16, money: true, value: (r) => r.invoiced },
      { header: "Received", key: "received", width: 16, money: true, value: (r) => r.received },
      { header: "Outstanding", key: "outstanding", width: 16, money: true, value: (r) => r.outstanding },
    ];

    const sum = (pick: (row: InvoiceRow) => number) =>
      round2(invoiceRows.reduce((total, row) => total + pick(row), 0));

    const buffer = await buildWorkbook({
      title: "Sales report",
      subtitle: `Nutan Tech Solutions · ${formatDate(from)} to ${formatDate(to)}`,
      sheets: [
        sheet<InvoiceRow>({
          name: "Sales register",
          columns: invoiceColumns,
          rows: invoiceRows,
          totals: {
            taxable: sum((r) => r.taxable),
            cgst: sum((r) => r.cgst),
            sgst: sum((r) => r.sgst),
            igst: sum((r) => r.igst),
            total: sum((r) => r.total),
            received: sum((r) => r.received),
            balance: sum((r) => r.balance),
          },
        }),
        sheet<CustomerRow>({
          name: "By customer",
          columns: customerColumns,
          rows: report.byCustomer.map((entry) => ({
            customer: entry.customer,
            invoiceCount: entry.invoiceCount,
            invoiced: entry.invoiced,
            received: entry.received,
            outstanding: entry.outstanding,
          })),
          totals: {
            invoiced: report.invoiced,
            received: report.received,
            outstanding: report.outstanding,
          },
        }),
      ],
    });

    return new Response(new Uint8Array(buffer), {
      headers: spreadsheetHeaders(
        `Sales-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.xlsx`,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
