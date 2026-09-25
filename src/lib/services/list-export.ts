import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { formatDate, today } from "@/lib/dates";
import {
  buildWorkbook,
  sheet,
  spreadsheetHeaders,
  type SheetColumn,
} from "@/lib/excel";
import { formatAmount, round2 } from "@/lib/money";
import { loadPdfAssets } from "@/lib/pdf/document-pdf";
import { ReportPdf, type ReportColumn } from "@/lib/pdf/report-pdf";
import { getCompanySettings } from "@/lib/settings";

export type ExportFormat = "xlsx" | "pdf";

export interface ExportColumn<T> {
  header: string;
  key: string;
  width: number;
  pdfWidth?: number;
  money?: boolean;
  pdfOnly?: boolean;
  excelOnly?: boolean;
  value: (row: T) => string | number;
}

export function describeFilters(
  parts: (string | null | undefined)[],
): string {
  return parts.filter(Boolean).join(" · ");
}

export function dateRangeLabel(from: Date | null, to: Date | null): string {
  if (!from && !to) return "All dates";
  return `${from ? formatDate(from) : "Start"} to ${to ? formatDate(to) : formatDate(today())}`;
}

export async function listExportResponse<T>(options: {
  format: ExportFormat;
  title: string;
  filters: string;
  columns: ExportColumn<T>[];
  rows: T[];
  summary?: { label: string; value: string }[];
  totals?: Record<string, number>;
}): Promise<Response> {
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${options.title.replace(/\s+/g, "-")}-${stamp}`;

  if (options.format === "pdf") {
    const [settings, assets] = await Promise.all([
      getCompanySettings(),
      loadPdfAssets(),
    ]);

    const columns = options.columns.filter((column) => !column.excelOnly);

    const pdfColumns: ReportColumn[] = columns.map((column) => ({
      header: column.header,
      width: column.pdfWidth ?? column.width,
      align: column.money ? "right" : "left",
    }));

    const rows = options.rows.map((row) =>
      columns.map((column) => {
        const value = column.value(row);
        return column.money ? formatAmount(Number(value)) : String(value);
      }),
    );

    const totals = options.totals
      ? columns.map((column, index) => {
          const total = options.totals?.[column.key];
          if (total !== undefined) return formatAmount(total);
          return index === 0 ? "Total" : null;
        })
      : undefined;

    const buffer = await renderToBuffer(
      ReportPdf({
        settings,
        title: options.title,
        subtitle: options.filters,
        generatedOn: formatDate(today()),
        summary: options.summary,
        columns: pdfColumns,
        rows,
        totals,
        assets,
      }),
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const columns: SheetColumn<T>[] = options.columns
    .filter((column) => !column.pdfOnly)
    .map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
      money: column.money,
      value: column.value,
    }));

  const buffer = await buildWorkbook({
    title: options.title,
    subtitle: options.filters,
    sheets: [
      sheet<T>({
        name: options.title,
        columns,
        rows: options.rows,
        totals: options.totals,
      }),
    ],
  });

  return new Response(new Uint8Array(buffer), {
    headers: spreadsheetHeaders(`${filename}.xlsx`),
  });
}

export function sumBy<T>(rows: T[], pick: (row: T) => number): number {
  return round2(rows.reduce((total, row) => total + pick(row), 0));
}
