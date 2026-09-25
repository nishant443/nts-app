import { z } from "zod";

import { errorResponse, parseQuery } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { formatDate, today } from "@/lib/dates";
import { formatAmount, round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import {
  dateRangeLabel,
  describeFilters,
  listExportResponse,
  sumBy,
  type ExportColumn,
} from "@/lib/services/list-export";
import { humanizeEnum } from "@/lib/utils";

export const runtime = "nodejs";

const PENDING_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;
const STATUS_FILTERS = ["PENDING", "PAID", "CANCELLED"] as const;

const querySchema = z.object({
  format: z.enum(["xlsx", "pdf"]).default("xlsx"),
  q: z.string().max(100).optional(),
  status: z.enum(STATUS_FILTERS).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

interface Row {
  number: string;
  date: string;
  dueDate: string;
  customer: string;
  gstin: string;
  status: string;
  taxable: number;
  tax: number;
  total: number;
  received: number;
  balance: number;
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    enforceRateLimit(
      `export:${user.id}`,
      RateLimits.export.limit,
      RateLimits.export.windowSeconds,
    );

    const query = parseQuery(request, querySchema);
    const term = query.q?.trim();
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : null;
    const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : null;

    const where = {
      ...(query.status
        ? query.status === "PENDING"
          ? { status: { in: [...PENDING_STATUSES] } }
          : { status: query.status }
        : {}),
      ...(from || to
        ? {
            date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) },
          }
        : {}),
      ...(term
        ? {
            OR: [
              { number: { contains: term, mode: "insensitive" as const } },
              { subject: { contains: term, mode: "insensitive" as const } },
              {
                customer: {
                  OR: [
                    { name: { contains: term, mode: "insensitive" as const } },
                    {
                      companyName: {
                        contains: term,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const records = await prisma.invoice.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        number: true,
        date: true,
        dueDate: true,
        status: true,
        taxableAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        total: true,
        amountPaid: true,
        customer: { select: { name: true, companyName: true, gstin: true } },
      },
    });

    const rows: Row[] = records.map((record) => {
      const total = toMoney(record.total);
      const received = toMoney(record.amountPaid);

      return {
        number: record.number,
        date: formatDate(record.date),
        dueDate: record.dueDate ? formatDate(record.dueDate) : "",
        customer: record.customer.companyName ?? record.customer.name,
        gstin: record.customer.gstin ?? "",
        status: humanizeEnum(record.status),
        taxable: toMoney(record.taxableAmount),
        tax:
          toMoney(record.cgstAmount) +
          toMoney(record.sgstAmount) +
          toMoney(record.igstAmount),
        total,
        received,
        balance: round2(total - received),
      };
    });

    const columns: ExportColumn<Row>[] = [
      { header: "Invoice", key: "number", width: 22, pdfWidth: 16, value: (r) => r.number },
      { header: "Date", key: "date", width: 14, pdfWidth: 10, value: (r) => r.date },
      { header: "Due", key: "dueDate", width: 14, pdfWidth: 10, value: (r) => r.dueDate },
      { header: "Customer", key: "customer", width: 32, pdfWidth: 22, value: (r) => r.customer },
      { header: "GSTIN", key: "gstin", width: 20, excelOnly: true, value: (r) => r.gstin },
      { header: "Status", key: "status", width: 15, pdfWidth: 12, value: (r) => r.status },
      { header: "Taxable", key: "taxable", width: 15, excelOnly: true, money: true, value: (r) => r.taxable },
      { header: "Tax", key: "tax", width: 14, excelOnly: true, money: true, value: (r) => r.tax },
      { header: "Total", key: "total", width: 16, pdfWidth: 12, money: true, value: (r) => r.total },
      { header: "Received", key: "received", width: 15, pdfWidth: 12, money: true, value: (r) => r.received },
      { header: "Balance", key: "balance", width: 15, pdfWidth: 12, money: true, value: (r) => r.balance },
    ];

    const total = sumBy(rows, (row) => row.total);
    const received = sumBy(rows, (row) => row.received);
    const balance = sumBy(rows, (row) => row.balance);

    const overdue = sumBy(
      records
        .filter(
          (record) =>
            record.dueDate !== null &&
            record.dueDate < today() &&
            toMoney(record.total) - toMoney(record.amountPaid) > 0.009,
        )
        .map((record) => ({
          due: round2(toMoney(record.total) - toMoney(record.amountPaid)),
        })),
      (entry) => entry.due,
    );

    return await listExportResponse<Row>({
      format: query.format,
      title: "Invoices",
      filters: describeFilters([
        dateRangeLabel(from, to),
        query.status
          ? `Status: ${query.status === "PENDING" ? "Pending payment" : humanizeEnum(query.status)}`
          : null,
        term ? `Search: ${term}` : null,
      ]),
      columns,
      rows,
      summary: [
        { label: "Invoices", value: String(rows.length) },
        { label: "Invoiced", value: formatAmount(total) },
        { label: "Received", value: formatAmount(received) },
        { label: "Outstanding", value: formatAmount(balance) },
        { label: "Overdue", value: formatAmount(overdue) },
      ],
      totals: {
        taxable: sumBy(rows, (row) => row.taxable),
        tax: sumBy(rows, (row) => row.tax),
        total,
        received,
        balance,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
