import { z } from "zod";

import { errorResponse, parseQuery } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { formatAmount, toMoney } from "@/lib/money";
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

const STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
] as const;

const querySchema = z.object({
  format: z.enum(["xlsx", "pdf"]).default("xlsx"),
  q: z.string().max(100).optional(),
  status: z.enum(STATUSES).optional(),
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
  validUntil: string;
  customer: string;
  subject: string;
  status: string;
  taxable: number;
  tax: number;
  total: number;
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
      ...(query.status ? { status: query.status } : {}),
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

    const records = await prisma.quotation.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        number: true,
        date: true,
        validUntil: true,
        status: true,
        subject: true,
        taxableAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        total: true,
        customer: { select: { name: true, companyName: true } },
      },
    });

    const rows: Row[] = records.map((record) => ({
      number: record.number,
      date: formatDate(record.date),
      validUntil: record.validUntil ? formatDate(record.validUntil) : "",
      customer: record.customer.companyName ?? record.customer.name,
      subject: record.subject ?? "",
      status: humanizeEnum(record.status),
      taxable: toMoney(record.taxableAmount),
      tax:
        toMoney(record.cgstAmount) +
        toMoney(record.sgstAmount) +
        toMoney(record.igstAmount),
      total: toMoney(record.total),
    }));

    const columns: ExportColumn<Row>[] = [
      { header: "Quotation", key: "number", width: 22, pdfWidth: 17, value: (r) => r.number },
      { header: "Date", key: "date", width: 14, pdfWidth: 11, value: (r) => r.date },
      { header: "Valid until", key: "validUntil", width: 14, pdfWidth: 11, value: (r) => r.validUntil },
      { header: "Customer", key: "customer", width: 32, pdfWidth: 24, value: (r) => r.customer },
      { header: "Subject", key: "subject", width: 30, excelOnly: true, value: (r) => r.subject },
      { header: "Status", key: "status", width: 13, pdfWidth: 11, value: (r) => r.status },
      { header: "Taxable", key: "taxable", width: 15, pdfWidth: 12, money: true, value: (r) => r.taxable },
      { header: "Tax", key: "tax", width: 14, pdfWidth: 11, money: true, value: (r) => r.tax },
      { header: "Total", key: "total", width: 16, pdfWidth: 13, money: true, value: (r) => r.total },
    ];

    const total = sumBy(rows, (row) => row.total);
    const accepted = sumBy(
      rows.filter((row) => row.status === "Accepted"),
      (row) => row.total,
    );

    return await listExportResponse<Row>({
      format: query.format,
      title: "Quotations",
      filters: describeFilters([
        dateRangeLabel(from, to),
        query.status ? `Status: ${humanizeEnum(query.status)}` : null,
        term ? `Search: ${term}` : null,
      ]),
      columns,
      rows,
      summary: [
        { label: "Quotations", value: String(rows.length) },
        { label: "Accepted value", value: formatAmount(accepted) },
        { label: "Total value", value: formatAmount(total) },
      ],
      totals: {
        taxable: sumBy(rows, (row) => row.taxable),
        tax: sumBy(rows, (row) => row.tax),
        total,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
