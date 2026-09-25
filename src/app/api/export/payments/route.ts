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

const STATUSES = ["PENDING", "RECEIVED", "FAILED", "CANCELLED"] as const;

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
  date: string;
  customer: string;
  invoice: string;
  mode: string;
  reference: string;
  status: string;
  recordedBy: string;
  amount: number;
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
    const isAdmin = user.role === "ADMIN";
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
      ...(isAdmin
        ? {}
        : {
            OR: [
              { customer: { ownerId: user.id } },
              { invoice: { createdById: user.id } },
              { recordedById: user.id },
            ],
          }),
      ...(term
        ? {
            AND: [
              {
                OR: [
                  {
                    reference: { contains: term, mode: "insensitive" as const },
                  },
                  {
                    invoice: {
                      number: { contains: term, mode: "insensitive" as const },
                    },
                  },
                  {
                    customer: {
                      OR: [
                        {
                          name: { contains: term, mode: "insensitive" as const },
                        },
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
              },
            ],
          }
        : {}),
    };

    const records = await prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        date: true,
        amount: true,
        mode: true,
        status: true,
        reference: true,
        customer: { select: { name: true, companyName: true } },
        invoice: { select: { number: true } },
        recordedBy: { select: { name: true } },
      },
    });

    const rows: Row[] = records.map((record) => ({
      date: formatDate(record.date),
      customer: record.customer.companyName ?? record.customer.name,
      invoice: record.invoice?.number ?? "",
      mode: humanizeEnum(record.mode),
      reference: record.reference ?? "",
      status: humanizeEnum(record.status),
      recordedBy: record.recordedBy.name,
      amount: toMoney(record.amount),
    }));

    const columns: ExportColumn<Row>[] = [
      { header: "Date", key: "date", width: 14, pdfWidth: 11, value: (r) => r.date },
      { header: "Customer", key: "customer", width: 34, pdfWidth: 26, value: (r) => r.customer },
      { header: "Invoice", key: "invoice", width: 20, pdfWidth: 15, value: (r) => r.invoice },
      { header: "Mode", key: "mode", width: 12, pdfWidth: 10, value: (r) => r.mode },
      { header: "Reference", key: "reference", width: 22, pdfWidth: 16, value: (r) => r.reference },
      { header: "Status", key: "status", width: 13, pdfWidth: 10, value: (r) => r.status },
      { header: "Recorded by", key: "recordedBy", width: 22, excelOnly: true, value: (r) => r.recordedBy },
      { header: "Amount", key: "amount", width: 16, pdfWidth: 12, money: true, value: (r) => r.amount },
    ];

    const total = sumBy(rows, (row) => row.amount);
    const received = sumBy(
      rows.filter((row) => row.status === "Received"),
      (row) => row.amount,
    );

    return await listExportResponse<Row>({
      format: query.format,
      title: "Payments",
      filters: describeFilters([
        dateRangeLabel(from, to),
        query.status ? `Status: ${humanizeEnum(query.status)}` : null,
        term ? `Search: ${term}` : null,
      ]),
      columns,
      rows,
      summary: [
        { label: "Payments", value: String(rows.length) },
        { label: "Received", value: formatAmount(received) },
        { label: "Total", value: formatAmount(total) },
      ],
      totals: { amount: total },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
