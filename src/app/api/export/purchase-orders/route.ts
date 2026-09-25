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
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
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
  expectedDate: string;
  vendor: string;
  gstin: string;
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
              {
                vendor: {
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

    const records = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        number: true,
        date: true,
        expectedDate: true,
        status: true,
        taxableAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        total: true,
        vendor: { select: { name: true, companyName: true, gstin: true } },
      },
    });

    const rows: Row[] = records.map((record) => ({
      number: record.number,
      date: formatDate(record.date),
      expectedDate: record.expectedDate ? formatDate(record.expectedDate) : "",
      vendor: record.vendor.companyName ?? record.vendor.name,
      gstin: record.vendor.gstin ?? "",
      status: humanizeEnum(record.status),
      taxable: toMoney(record.taxableAmount),
      tax:
        toMoney(record.cgstAmount) +
        toMoney(record.sgstAmount) +
        toMoney(record.igstAmount),
      total: toMoney(record.total),
    }));

    const columns: ExportColumn<Row>[] = [
      { header: "Order", key: "number", width: 22, pdfWidth: 17, value: (r) => r.number },
      { header: "Date", key: "date", width: 14, pdfWidth: 11, value: (r) => r.date },
      { header: "Expected", key: "expectedDate", width: 14, pdfWidth: 11, value: (r) => r.expectedDate },
      { header: "Vendor", key: "vendor", width: 32, pdfWidth: 24, value: (r) => r.vendor },
      { header: "GSTIN", key: "gstin", width: 20, excelOnly: true, value: (r) => r.gstin },
      { header: "Status", key: "status", width: 18, pdfWidth: 13, value: (r) => r.status },
      { header: "Taxable", key: "taxable", width: 15, pdfWidth: 12, money: true, value: (r) => r.taxable },
      { header: "Tax", key: "tax", width: 14, pdfWidth: 11, money: true, value: (r) => r.tax },
      { header: "Total", key: "total", width: 16, pdfWidth: 13, money: true, value: (r) => r.total },
    ];

    const total = sumBy(rows, (row) => row.total);
    const pending = sumBy(
      rows.filter(
        (row) => row.status !== "Received" && row.status !== "Cancelled",
      ),
      (row) => row.total,
    );

    return await listExportResponse<Row>({
      format: query.format,
      title: "Purchase orders",
      filters: describeFilters([
        dateRangeLabel(from, to),
        query.status ? `Status: ${humanizeEnum(query.status)}` : null,
        term ? `Search: ${term}` : null,
      ]),
      columns,
      rows,
      summary: [
        { label: "Orders", value: String(rows.length) },
        { label: "Awaiting delivery", value: formatAmount(pending) },
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
