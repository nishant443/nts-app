import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";

import { errorResponse, parseQuery } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { formatDate, today } from "@/lib/dates";
import {
  buildWorkbook,
  sheet,
  spreadsheetHeaders,
  type SheetColumn,
} from "@/lib/excel";
import { formatAmount, round2, toMoney } from "@/lib/money";
import { loadPdfAssets } from "@/lib/pdf/document-pdf";
import { ReportPdf, type ReportColumn } from "@/lib/pdf/report-pdf";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import { getCompanySettings } from "@/lib/settings";
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

interface PaymentExportRow {
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
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
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
                  { reference: { contains: term, mode: "insensitive" as const } },
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

    const rows: PaymentExportRow[] = records.map((record) => ({
      date: formatDate(record.date),
      customer: record.customer.companyName ?? record.customer.name,
      invoice: record.invoice?.number ?? "",
      mode: humanizeEnum(record.mode),
      reference: record.reference ?? "",
      status: humanizeEnum(record.status),
      recordedBy: record.recordedBy?.name ?? "",
      amount: toMoney(record.amount),
    }));

    const total = round2(rows.reduce((sum, row) => sum + row.amount, 0));
    const received = round2(
      rows
        .filter((row) => row.status === "Received")
        .reduce((sum, row) => sum + row.amount, 0),
    );

    const period =
      from || to
        ? `${from ? formatDate(from) : "Start"} to ${to ? formatDate(to) : formatDate(today())}`
        : "All dates";
    const filters = [
      period,
      query.status ? `Status: ${humanizeEnum(query.status)}` : null,
      term ? `Search: ${term}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const stamp = new Date().toISOString().slice(0, 10);

    if (query.format === "pdf") {
      const [settings, assets] = await Promise.all([
        getCompanySettings(),
        loadPdfAssets(),
      ]);

      const columns: ReportColumn[] = [
        { header: "Date", width: 11 },
        { header: "Customer", width: 26 },
        { header: "Invoice", width: 15 },
        { header: "Mode", width: 10 },
        { header: "Reference", width: 16 },
        { header: "Status", width: 10 },
        { header: "Amount", width: 12, align: "right" },
      ];

      const buffer = await renderToBuffer(
        ReportPdf({
          settings,
          title: "Payments",
          subtitle: filters,
          generatedOn: formatDate(today()),
          summary: [
            { label: "Payments", value: String(rows.length) },
            { label: "Received", value: formatAmount(received) },
            { label: "Total", value: formatAmount(total) },
          ],
          columns,
          rows: rows.map((row) => [
            row.date,
            row.customer,
            row.invoice,
            row.mode,
            row.reference,
            row.status,
            formatAmount(row.amount),
          ]),
          totals: [
            "Total",
            null,
            null,
            null,
            null,
            null,
            formatAmount(total),
          ],
          assets,
        }),
      );

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Payments-${stamp}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const columns: SheetColumn<PaymentExportRow>[] = [
      { header: "Date", key: "date", width: 14, value: (r) => r.date },
      { header: "Customer", key: "customer", width: 34, value: (r) => r.customer },
      { header: "Invoice", key: "invoice", width: 20, value: (r) => r.invoice },
      { header: "Mode", key: "mode", width: 12, value: (r) => r.mode },
      { header: "Reference", key: "reference", width: 22, value: (r) => r.reference },
      { header: "Status", key: "status", width: 13, value: (r) => r.status },
      { header: "Recorded by", key: "recordedBy", width: 22, value: (r) => r.recordedBy },
      { header: "Amount", key: "amount", width: 16, money: true, value: (r) => r.amount },
    ];

    const buffer = await buildWorkbook({
      title: "Payments",
      subtitle: filters,
      sheets: [
        sheet<PaymentExportRow>({
          name: "Payments",
          columns,
          rows,
          totals: { amount: total },
        }),
      ],
    });

    return new Response(new Uint8Array(buffer), {
      headers: spreadsheetHeaders(`Payments-${stamp}.xlsx`),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
