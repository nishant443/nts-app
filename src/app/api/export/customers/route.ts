import { z } from "zod";

import { errorResponse, parseQuery } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";
import {
  describeFilters,
  listExportResponse,
  type ExportColumn,
} from "@/lib/services/list-export";
import { searchFilter } from "@/lib/query";
import { humanizeEnum } from "@/lib/utils";

export const runtime = "nodejs";

const TYPES = ["LEAD", "ACTIVE", "INACTIVE", "VENDOR"] as const;

const querySchema = z.object({
  format: z.enum(["xlsx", "pdf"]).default("xlsx"),
  q: z.string().max(100).optional(),
  type: z.enum(TYPES).optional(),
});

interface Row {
  customer: string;
  contact: string;
  type: string;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  state: string;
  owner: string;
  quotations: number;
  invoices: number;
  added: string;
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

    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(searchFilter(term, [
        "name",
        "companyName",
        "email",
        "phone",
        "gstin",
        "city",
      ]) ?? {}),
    };

    const records = await prisma.customer.findMany({
      where,
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: {
        name: true,
        companyName: true,
        type: true,
        phone: true,
        email: true,
        gstin: true,
        city: true,
        state: true,
        createdAt: true,
        owner: { select: { name: true } },
        _count: { select: { invoices: true, quotations: true } },
      },
    });

    const rows: Row[] = records.map((record) => ({
      customer: record.companyName ?? record.name,
      contact: record.companyName ? record.name : "",
      type: humanizeEnum(record.type),
      phone: record.phone ?? "",
      email: record.email ?? "",
      gstin: record.gstin ?? "",
      city: record.city ?? "",
      state: record.state ?? "",
      owner: record.owner?.name ?? "",
      quotations: record._count.quotations,
      invoices: record._count.invoices,
      added: formatDate(record.createdAt),
    }));

    const columns: ExportColumn<Row>[] = [
      { header: "Customer", key: "customer", width: 34, pdfWidth: 22, value: (r) => r.customer },
      { header: "Contact", key: "contact", width: 24, pdfWidth: 15, value: (r) => r.contact },
      { header: "Type", key: "type", width: 12, pdfWidth: 9, value: (r) => r.type },
      { header: "Phone", key: "phone", width: 18, pdfWidth: 13, value: (r) => r.phone },
      { header: "Email", key: "email", width: 28, pdfWidth: 20, value: (r) => r.email },
      { header: "GSTIN", key: "gstin", width: 20, pdfWidth: 15, value: (r) => r.gstin },
      { header: "City", key: "city", width: 18, pdfWidth: 12, value: (r) => r.city },
      { header: "State", key: "state", width: 18, excelOnly: true, value: (r) => r.state },
      { header: "Owner", key: "owner", width: 20, excelOnly: true, value: (r) => r.owner },
      { header: "Quotations", key: "quotations", width: 12, excelOnly: true, value: (r) => r.quotations },
      { header: "Invoices", key: "invoices", width: 11, excelOnly: true, value: (r) => r.invoices },
      { header: "Added", key: "added", width: 14, pdfWidth: 11, value: (r) => r.added },
    ];

    return await listExportResponse<Row>({
      format: query.format,
      title: "Customers",
      filters: describeFilters([
        query.type ? `Type: ${humanizeEnum(query.type)}` : "All types",
        term ? `Search: ${term}` : null,
      ]),
      columns,
      rows,
      summary: [
        { label: "Customers", value: String(rows.length) },
        {
          label: "With GSTIN",
          value: String(rows.filter((row) => row.gstin).length),
        },
      ],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
